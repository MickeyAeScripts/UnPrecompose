// UnPrecompose.jsx
// Replaces the selected precomp layer(s) with their nested layers, time-offset by the
// precomp layer's start time so everything sits exactly where it played inside the precomp.
// Preserves stacking order, parenting, track mattes, locks; trims copies to the range the
// precomp layer actually showed. Single undo group.
//
// NOTE: copyToComp() does NOT reliably insert at index 1 (insertion is influenced by the
// target comp's selection), so new copies are identified by layer.id diff.
(function () {
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
        alert("Un-Precompose: open a comp and select precomp layer(s).");
        return;
    }
    var sel = comp.selectedLayers.slice(0);
    if (sel.length === 0) {
        alert("Un-Precompose: select at least one precomp layer.");
        return;
    }

    var warnings = [];
    var newlyAdded = [];

    // copy a layer into targetComp and return the actual new layer, found by id diff
    // NOTE: copyToComp() refuses to run on a layer with a parent while an Undo Group is
    // open, so the parent is cleared for the duration of the copy and restored after -
    // the source's own parent isn't needed afterward since relationships are rebuilt
    // from the snapshot in `info`.
    function copyLayerIn(srcLayer, targetComp) {
        var savedParent = srcLayer.parent;
        if (savedParent) srcLayer.parent = null;
        var before = {};
        for (var k = 1; k <= targetComp.numLayers; k++) before[targetComp.layer(k).id] = true;
        srcLayer.copyToComp(targetComp);
        if (savedParent) srcLayer.parent = savedParent;
        for (var k = 1; k <= targetComp.numLayers; k++) {
            if (!before[targetComp.layer(k).id]) return targetComp.layer(k);
        }
        return null;
    }

    app.beginUndoGroup("Un-Precompose");
    try {
        for (var s = 0; s < sel.length; s++) {
            var preLayer = sel[s];
            var src = preLayer.source;
            if (!(src && src instanceof CompItem)) {
                warnings.push("'" + preLayer.name + "': not a precomp - skipped.");
                continue;
            }
            if (preLayer.canSetTimeRemapEnabled && preLayer.timeRemapEnabled) {
                warnings.push("'" + preLayer.name + "': time-remapped - skipped.");
                continue;
            }
            if (preLayer.stretch !== 100) {
                warnings.push("'" + preLayer.name + "': stretched (" + preLayer.stretch + "%) - skipped.");
                continue;
            }
            if (preLayer.property("ADBE Effect Parade").numProperties > 0 ||
                preLayer.property("ADBE Mask Parade").numProperties > 0) {
                warnings.push("'" + preLayer.name + "': the precomp layer itself has effects/masks - layers extracted, but those effects/masks are lost.");
            }

            if (preLayer.locked) preLayer.locked = false;

            var offset = preLayer.startTime;
            var preIn = preLayer.inPoint;
            var preOut = preLayer.outPoint;

            // neutralize selection so copyToComp behaves predictably
            for (var k = 1; k <= comp.numLayers; k++) comp.layer(k).selected = false;

            // snapshot inner-layer timing/relationships before copying
            var n = src.numLayers;
            var info = [];
            for (var i = 1; i <= n; i++) {
                var il = src.layer(i);
                var rec = {
                    start: il.startTime, inP: il.inPoint, outP: il.outPoint,
                    locked: il.locked,
                    parentIdx: (il.parent ? il.parent.index : 0),
                    matteIdx: 0, matteType: null
                };
                try {
                    if (il.trackMatteType !== TrackMatteType.NO_TRACK_MATTE) {
                        rec.matteType = il.trackMatteType;
                        rec.matteIdx = il.trackMatteLayer ? il.trackMatteLayer.index : (i - 1);
                    }
                } catch (e) {}
                info.push(rec);
            }

            // copy top->bottom; tuck each copy just above the precomp layer
            // (preserves nested stacking order), then set times ABSOLUTELY from snapshot
            var copies = [];
            for (var i = 1; i <= n; i++) {
                var il = src.layer(i);
                var rec = info[i - 1];
                if (rec.locked) il.locked = false;
                var nl = copyLayerIn(il, comp);
                if (rec.locked) il.locked = true;
                if (!nl) { throw new Error("Copy of '" + il.name + "' not found in target comp."); }
                nl.locked = false;
                nl.selected = false;
                nl.moveBefore(preLayer);
                nl.startTime = rec.start + offset;
                var tIn = rec.inP + offset;
                var tOut = rec.outP + offset;
                // trim to what the precomp actually showed (skip layers with no overlap)
                if (tIn < preOut && tOut > preIn) {
                    if (tIn < preIn) tIn = preIn;
                    if (tOut > preOut) tOut = preOut;
                }
                nl.inPoint = tIn;
                nl.outPoint = tOut;
                copies.push(nl);
            }

            // relink parenting among the copies (same transforms -> identical result)
            for (var i = 0; i < n; i++) {
                if (info[i].parentIdx > 0) copies[i].parent = copies[info[i].parentIdx - 1];
            }
            // restore track mattes among the copies
            for (var i = 0; i < n; i++) {
                if (info[i].matteType !== null && info[i].matteIdx > 0) {
                    try { copies[i].setTrackMatte(copies[info[i].matteIdx - 1], info[i].matteType); }
                    catch (e) { try { copies[i].trackMatteType = info[i].matteType; } catch (e2) {} }
                }
            }
            for (var i = 0; i < n; i++) {
                if (info[i].locked) copies[i].locked = true;
                newlyAdded.push(copies[i]);
            }

            preLayer.remove();
        }

        // leave just the extracted layers selected
        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        for (var i = 0; i < newlyAdded.length; i++) newlyAdded[i].selected = true;
    } catch (err) {
        warnings.push("Error: " + err.toString() + (err.line ? " (line " + err.line + ")" : ""));
    } finally {
        app.endUndoGroup();
    }

    if (warnings.length) alert("Un-Precompose:\n" + warnings.join("\n"));
})();
