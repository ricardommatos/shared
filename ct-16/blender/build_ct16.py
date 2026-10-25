"""
CT-16 — Blender scene builder.

Builds the whole CT-16 instrument (slab, keys, encoders, screen, speaker,
round keys, ribbon, step row, ports, side tab, cable, logo) in a matte
charcoal product-render style with orange accents, then sets up two
cameras: a top-down portrait shot and a true-isometric shot.

Run inside Blender: Scripting tab > Open > build_ct16.py > Run Script.
Run headless:       python build_ct16.py --render   (needs the `bpy` module)
Keep the `textures/` folder and `ct-logo.svg` next to this file.
"""
import bpy, math, os, sys
from mathutils import Vector

try:
    BASE = os.path.dirname(os.path.abspath(__file__))
except NameError:
    BASE = os.path.dirname(bpy.data.filepath) or os.path.expanduser("~")
TEX = os.path.join(BASE, "textures")

# ---------------------------------------------------------------- helpers
W, D, HZ = 12.8, 7.2, 1.4          # slab size (1 unit = 10 mm)
TZ = HZ                             # top surface height


def L(x, y):
    """Panel layout coords (same grid as the web version, mm) -> Blender XY."""
    return ((x - 64) / 10, -(y - 36) / 10)


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, color, rough=.5, metal=0., coat=0., emit=None, strength=0.):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if coat:
        b.inputs["Coat Weight"].default_value = coat
        b.inputs["Coat Roughness"].default_value = .25
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    return m


def fine_grain(m, scale=900., strength=.04):
    """Bead-blasted plastic: tiny noise bump."""
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = strength
    nt.links.new(n.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


def bevel(ob, width, seg=5, angle=40):
    mod = ob.modifiers.new("bevel", "BEVEL")
    mod.width = width; mod.segments = seg
    mod.limit_method = "ANGLE"; mod.angle_limit = math.radians(angle)
    mod.harden_normals = False
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def put(ob, root, m=None):
    ob.parent = root
    if m:
        ob.data.materials.clear(); ob.data.materials.append(m)
    return ob


def box(root, x, y, w, d, h, z0, m, bev=.04, seg=4, name="box"):
    X, Y = L(x + w / 2, y + d / 2)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(X, Y, z0 + h / 2))
    ob = bpy.context.object; ob.name = name
    ob.scale = (w / 10, d / 10, h); bpy.ops.object.transform_apply(scale=True)
    if bev: bevel(ob, bev, seg)
    return put(ob, root, m)


def cyl(root, x, y, r, h, z0, m, bev=.03, seg=3, verts=64, name="cyl"):
    X, Y = L(x, y)
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=(X, Y, z0 + h / 2))
    ob = bpy.context.object; ob.name = name
    if bev: bevel(ob, bev, seg, 30)
    return put(ob, root, m)


FONT = None


def text(root, s, x, y, z, size, m, align="LEFT", rot=0., name="label"):
    X, Y = L(x, y)
    bpy.ops.object.text_add(location=(X, Y, z + .002), rotation=(0, 0, rot))
    ob = bpy.context.object; ob.name = name
    ob.data.body = s; ob.data.size = size; ob.data.align_x = align
    if FONT: ob.data.font = FONT
    return put(ob, root, m)


# ---------------------------------------------------------------- scene
def build():
    global FONT
    clear()
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
              "/Library/Fonts/Menlo.ttc", "C:/Windows/Fonts/consolab.ttf"):
        if os.path.exists(p):
            try: FONT = bpy.data.fonts.load(p); break
            except Exception: pass

    sc = bpy.context.scene
    root = bpy.data.objects.new("CT-16", None); sc.collection.objects.link(root)

    # materials
    M = {
        "body": fine_grain(mat("Body charcoal", (.020, .020, .019), .62, coat=.08)),
        "key": fine_grain(mat("Key charcoal", (.028, .028, .027), .55, coat=.1), 1200, .03),
        "knob": fine_grain(mat("Knob", (.024, .024, .023), .42, coat=.25), 1500, .02),
        "dark": mat("Recess black", (.008, .008, .008), .35),
        "glass": mat("Screen glass", (0, 0, 0), .22),
        "orange": mat("Orange", (.85, .20, .045), .42, coat=.2),
        "print": mat("Print grey", (.32, .32, .31), .7),
        "print_o": mat("Print orange", (.85, .25, .06), .6, emit=(1, .35, .1), strength=1.5),
        "led_on": mat("LED on", (.9, .3, .05), .3, emit=(1, .38, .1), strength=12),
        "led_off": mat("LED off", (.03, .03, .03), .3),
        "white": mat("Indicator white", (.75, .75, .72), .5),
        "rubber": mat("Cable rubber", (.012, .012, .012), .48, coat=.1),
        "metal": mat("Plug metal", (.55, .55, .55), .28, metal=1.),
        "floor": mat("Floor", (.010, .010, .011), .85),
    }

    # screen material: emissive image under glossy glass
    g = M["glass"]; nt = g.node_tree; b = nt.nodes["Principled BSDF"]
    img = nt.nodes.new("ShaderNodeTexImage")
    img.image = bpy.data.images.load(os.path.join(TEX, "screen.png"))
    nt.links.new(img.outputs["Color"], b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = 1.4
    b.inputs["Specular IOR Level"].default_value = .15

    # speaker dot field (procedural)
    spk = mat("Speaker grille", (.02, .02, .02), .6)
    nt = spk.node_tree; b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mul = nt.nodes.new("ShaderNodeVectorMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = (9, 9, 9)
    fr = nt.nodes.new("ShaderNodeVectorMath"); fr.operation = "FRACTION"
    sub = nt.nodes.new("ShaderNodeVectorMath"); sub.operation = "SUBTRACT"; sub.inputs[1].default_value = (.5, .5, 0)
    ln = nt.nodes.new("ShaderNodeVectorMath"); ln.operation = "LENGTH"
    lt = nt.nodes.new("ShaderNodeMath"); lt.operation = "LESS_THAN"; lt.inputs[1].default_value = .26
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
    mix.inputs[6].default_value = (.022, .022, .021, 1); mix.inputs[7].default_value = (.002, .002, .002, 1)
    for a, z in ((tc.outputs["Object"], mul.inputs[0]), (mul.outputs[0], fr.inputs[0]), (fr.outputs[0], sub.inputs[0]),
                 (sub.outputs[0], ln.inputs[0]), (ln.outputs["Value"], lt.inputs[0]), (lt.outputs[0], mix.inputs[0]),
                 (mix.outputs[2], b.inputs["Base Color"])):
        nt.links.new(a, z)

    # --- slab
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, HZ / 2))
    slab = bpy.context.object; slab.name = "Body"
    slab.scale = (W, D, HZ); bpy.ops.object.transform_apply(scale=True)
    bv = slab.modifiers.new("corner", "BEVEL"); bv.affect = "EDGES"; bv.width = .09; bv.segments = 4
    bv.limit_method = "ANGLE"; bv.angle_limit = math.radians(60)
    for p in slab.data.polygons: p.use_smooth = True
    put(slab, root, M["body"])

    # screws
    for sx, sy in ((3.6, 3.6), (124.4, 3.6), (3.6, 68.4), (124.4, 68.4)):
        cyl(root, sx, sy, .17, .025, TZ - .005, M["metal"], bev=.008, name="Screw")
        box(root, sx - 1.1, sy - .14, 2.2, .28, .012, TZ + .016, M["dark"], bev=0, name="Screw slot")

    # speaker
    sp = cyl(root, 14, 15, .95, .04, TZ - .02, spk, bev=.008, name="Speaker")
    cyl(root, 14, 15, 1.02, .02, TZ - .01, M["dark"], bev=0, name="Speaker ring")

    # screen: bezel + glass
    box(root, 28.8, 4.8, 34.4, 21.4, .06, TZ, M["dark"], bev=.03, name="Screen bezel")
    X, Y = L(46, 15.5)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(X, Y, TZ + .062))
    sg = bpy.context.object; sg.name = "Screen"; sg.scale = (3.2, 1.9, 1); bpy.ops.object.transform_apply(scale=True)
    put(sg, root, M["glass"])

    # keys 4x4
    names = ["kick", "snare", "c.hat", "o.hat", "clap", "rim", "tom lo", "tom mid",
             "tom hi", "cowbell", "clave", "conga", "shaker", "zap", "sub", "crash"]
    keys = "1234qwerasdfzxcv"
    for r in range(4):
        for c in range(4):
            n = r * 4 + c; x = 8 + c * 13.3; y = 31 + r * 8.9
            box(root, x, y, 12, 7.6, .2, TZ, M["key"], bev=.018, seg=3, name=f"Key {names[n]}")
            mp = M["print_o"] if n == 0 else M["print"]
            text(root, names[n], x + .9, y + 6.4, TZ + .2, .13, mp, name=f"Label {names[n]}")
            text(root, keys[n], x + 11.1, y + 2.3, TZ + .2, .13, mp, "RIGHT", name=f"Key letter {keys[n]}")
    text(root, "PADS", 8, 29.6, TZ, .11, M["print"])

    # encoders
    for i, (ex, lbl) in enumerate(((74, "TEMPO"), (89, "FILTER"), (104, "SPACE"), (119, "PITCH"))):
        cyl(root, ex, 15, .57, .05, TZ, M["dark"], bev=.01, name=f"Encoder base {lbl}")
        k = cyl(root, ex, 15, .5, .55, TZ + .03, M["knob"], bev=.02, seg=3, verts=96, name=f"Encoder {lbl}")
        cyl(root, ex, 15, .36, .02, TZ + .58, M["key"], bev=.008, name=f"Encoder cap {lbl}")
        ang = math.radians([-60, 20, -110, 0][i])
        ix, iy = L(ex, 15)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(ix + math.cos(ang) * .3, iy + math.sin(ang) * .3, TZ + .6))
        ind = bpy.context.object; ind.name = f"Indicator {lbl}"
        ind.scale = (.22, .045, .02); ind.rotation_euler[2] = ang; bpy.ops.object.transform_apply(scale=True)
        put(ind, root, M["orange"] if i == 0 else M["white"])
        text(root, lbl, ex - 5, 22.6, TZ, .11, M["print"])

    # round experimental keys
    for k, lbl in enumerate(("EXPLODE", "GRAVITY", "GLITCH", "WARP", "INVERT", "LOGO")):
        c, r = k % 3, k // 3; x = 76 + c * 14; y = 31 + r * 10.5
        cyl(root, x, y, .31, .16, TZ, M["key"], bev=.015, name=f"Key {lbl}")
        cyl(root, x, y, .07, .01, TZ + .16, M["led_on"] if lbl == "LOGO" else M["dark"], bev=0, name=f"Dot {lbl}")
        text(root, lbl, x - 3.4, y + 5.6, TZ, .1, M["print"])

    # play
    cyl(root, 120, 41, .52, .22, TZ, M["orange"], bev=.02, seg=3, name="Play")
    X, Y = L(119.4, 41)
    bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=.2, depth=.01, location=(X, Y, TZ + .225))
    tri = bpy.context.object; tri.name = "Play icon"; tri.rotation_euler[2] = 0
    put(tri, root, M["dark"])
    text(root, "PLAY", 115, 48.4, TZ, .1, M["print"])

    # ribbon
    box(root, 70, 53, 54, 4.5, .02, TZ - .005, M["glass"].copy() if False else M["dark"], bev=.01, name="Ribbon")
    for i, t in enumerate(("1/4", "1/8", "1/16", "1/32")):
        text(root, t, 71 + i * 13.5, 52.3, TZ, .09, M["print"])
        if i: box(root, 70 + i * 13.5 - .1, 53.6, .2, 3.3, .01, TZ + .015, M["print"], bev=0, name="Ribbon tick")
    text(root, "REPEAT", 124, 52.3, TZ, .09, M["print"], "RIGHT")

    # step row + LEDs
    for i in range(16):
        x = 70 + i * 3.4
        box(root, x, 62, 2.8, 4, .1, TZ, M["key"], bev=.012, seg=2, name=f"Step {i + 1}")
        cyl(root, x + 1.4, 68.2, .045, .012, TZ, M["led_on"] if i in (0, 3, 8, 10) else M["led_off"], bev=0, verts=24, name=f"LED {i + 1}")
        if i % 4 == 0: text(root, str(i + 1), x, 70.8, TZ, .09, M["print"])
    text(root, "STEPS · KICK", 70, 59.4, TZ, .1, M["print"])

    # ports on the right side
    for py in (18, 26):
        X, Y = L(128, py)
        bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=.17, depth=.2, location=(X - .02, Y, .75), rotation=(0, math.pi / 2, 0))
        put(bpy.context.object, root, M["dark"]).name = "Jack"
    X, Y = L(128, 36)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(X - .02, Y, .75)); u = bpy.context.object
    u.scale = (.2, .42, .16); bpy.ops.object.transform_apply(scale=True); bevel(u, .06, 4); put(u, root, M["dark"]).name = "USB-C"

    # orange side tab on the back edge
    tb = box(root, 100, -2.6, 14, 3.2, .62, .4, M["orange"], bev=.03, seg=3, name="Side tab")

    # cable: plug + curve that runs off frame
    X, Y = L(128, 36)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(X + .32, Y, .75)); pg = bpy.context.object
    pg.scale = (.55, .5, .3); bpy.ops.object.transform_apply(scale=True); bevel(pg, .1, 5); put(pg, root, M["rubber"]).name = "Plug"
    cd = bpy.data.curves.new("Cable", "CURVE"); cd.dimensions = "3D"; cd.bevel_depth = .085; cd.bevel_resolution = 6
    sp_ = cd.splines.new("BEZIER"); sp_.bezier_points.add(3)
    ptsv = [(X + .6, Y, .75), (X + 2.2, Y, .2), (X + 6, Y - .3, .09), (X + 30, Y - 1.4, .09)]
    for bp, co in zip(sp_.bezier_points, ptsv):
        bp.co = co; bp.handle_left_type = bp.handle_right_type = "AUTO"
    cab = bpy.data.objects.new("Cable", cd); sc.collection.objects.link(cab); put(cab, root, M["rubber"])

    # logo: vector import, printed on the top surface
    try:
        before = set(bpy.data.objects)
        bpy.ops.import_curve.svg(filepath=os.path.join(BASE, "ct-logo.svg"))
        new = [o for o in bpy.data.objects if o not in before and o.type == "CURVE"]
        if new:
            bpy.ops.object.select_all(action="DESELECT")
            for o in new: o.select_set(True)
            bpy.context.view_layer.objects.active = new[0]
            if len(new) > 1: bpy.ops.object.join()
            lg = bpy.context.object; lg.name = "Logo"
            lg.data.dimensions = "2D"; lg.data.fill_mode = "BOTH"; lg.data.extrude = 0
            bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
            s = .52 / max(lg.dimensions.x, lg.dimensions.y); lg.scale = (s, s, s)
            X, Y = L(64.5, 67.8); lg.location = (X, Y, TZ + .003)
            for c in list(lg.users_collection):
                if c != sc.collection: c.objects.unlink(lg)
            if lg.name not in sc.collection.objects: sc.collection.objects.link(lg)
            put(lg, root, M["print"])
    except Exception as e:
        print("logo import skipped:", e)

    # floor, world, lights
    bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0)); fl = bpy.context.object; fl.name = "Floor"
    fl.data.materials.append(M["floor"])
    wd = bpy.data.worlds.new("World"); sc.world = wd; wd.use_nodes = True
    wd.node_tree.nodes["Background"].inputs["Color"].default_value = (.004, .004, .0045, 1)
    wd.node_tree.nodes["Background"].inputs["Strength"].default_value = 1

    def area(name, loc, rot, size, power, color=(1, 1, 1)):
        ld = bpy.data.lights.new(name, "AREA"); ld.shape = "RECTANGLE"; ld.size = size[0]; ld.size_y = size[1]
        ld.energy = power; ld.color = color
        o = bpy.data.objects.new(name, ld); o.location = loc; o.rotation_euler = rot; sc.collection.objects.link(o)
        return o
    area("Key softbox", (0, 2, 16), (math.radians(-6), 0, 0), (14, 10), 5200, (1, .98, .95))
    area("Rim left", (-14, 6, 5), (math.radians(70), 0, math.radians(-120)), (6, 2), 900, (.9, .95, 1))
    area("Glint right", (12, -8, 7), (math.radians(60), 0, math.radians(55)), (4, 1), 500)

    # cameras
    ct = bpy.data.cameras.new("Top"); ct.type = "ORTHO"; ct.ortho_scale = 17.5
    cam_top = bpy.data.objects.new("Cam Top", ct); cam_top.location = (0, -.6, 40); sc.collection.objects.link(cam_top)
    ci = bpy.data.cameras.new("Iso"); ci.type = "ORTHO"; ci.ortho_scale = 19
    cam_iso = bpy.data.objects.new("Cam Iso", ci); sc.collection.objects.link(cam_iso)
    cam_iso.location = (30, -30, 30 + .9); cam_iso.rotation_euler = (math.radians(54.7356), 0, math.radians(45))

    # render settings
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 128; sc.cycles.use_denoising = True
    try: sc.cycles.device = "CPU"
    except Exception: pass
    try:
        sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    sc.render.film_transparent = False
    return root, cam_top, cam_iso


def shot(root, cam, rotz, res, path, samples=None):
    sc = bpy.context.scene
    root.rotation_euler = (0, 0, rotz); sc.camera = cam
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.resolution_percentage = 100
    if samples: sc.cycles.samples = samples
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    root, cam_top, cam_iso = build()
    root.rotation_euler = (0, 0, -math.pi / 2); bpy.context.scene.camera = cam_top
    bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y = 1080, 1350
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BASE, "ct16.blend"))
    if "--render" in sys.argv:
        out = os.path.join(BASE, "renders"); os.makedirs(out, exist_ok=True)
        smp = int(os.environ.get("CT16_SAMPLES", "128"))
        shot(root, cam_top, -math.pi / 2, (1080, 1350), os.path.join(out, "ct16_top.png"), smp)
        shot(root, cam_iso, 0, (1600, 1100), os.path.join(out, "ct16_iso.png"), smp)
        root.rotation_euler = (0, 0, -math.pi / 2); bpy.context.scene.camera = cam_top
        bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y = 1080, 1350
        bpy.ops.file.pack_all()
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BASE, "ct16.blend"))
