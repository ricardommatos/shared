"""
CT-16 — scroll film.

Builds the scene with build_ct16.py, adds a camera move (top view > isometric >
screen > keys > knobs > pull back) and an exploded-view finish, then renders
an image sequence for the scroll page in ../scroll/frames.

Run headless:  python animate_scroll.py [start end]
Inside Blender: run build_ct16.py first, then this script.
"""
import bpy, math, os, sys
from mathutils import Vector

try:
    BASE = os.path.dirname(os.path.abspath(__file__))
except NameError:
    BASE = os.path.dirname(bpy.data.filepath)
sys.path.insert(0, BASE)
import build_ct16 as B

FRAMES = 150
OUT = os.path.normpath(os.path.join(BASE, "..", "scroll", "frames"))

# camera path: (frame, camera location, look-at target)
PATH = [
    (1,   (0, -0.4, 34),     (0, 0, 0.7)),
    (30,  (20, -22, 20),     (0, 0, 0.6)),
    (55,  (1.4, -5.2, 7.4),  (-1.8, 2.0, 1.45)),
    (80,  (-6.2, -10, 4.4),  (-3.0, -1.1, 1.4)),
    (105, (9.5, -7.5, 6.2),  (4.4, 0.9, 1.6)),
    (128, (20, -22, 20),     (0, 0, 0.8)),
    (150, (19, -26, 27),     (0, 0, 2.6)),
]

# exploded view: lift per part family over the last frames
EXPLODE = [("Key ", 2.2), ("Label ", 2.2), ("Key letter", 2.2), ("Encoder", 4.0), ("Indicator", 4.0),
           ("Screen", 3.1), ("Dot ", 1.9), ("Play", 2.8), ("Step ", 1.2), ("LED ", 1.2), ("Speaker", .9), ("Screw", .6)]
EX0, EX1 = 128, 150


def setup():
    root, cam_top, cam_iso = B.build()
    sc = bpy.context.scene
    root.rotation_euler = (0, 0, 0)

    # long-lens perspective camera aimed at an animated target
    cd = bpy.data.cameras.new("Scroll"); cd.lens = 70; cd.clip_end = 400
    cam = bpy.data.objects.new("Cam Scroll", cd); sc.collection.objects.link(cam)
    tgt = bpy.data.objects.new("Cam Target", None); sc.collection.objects.link(tgt)
    con = cam.constraints.new("TRACK_TO"); con.target = tgt
    con.track_axis = "TRACK_NEGATIVE_Z"; con.up_axis = "UP_Y"
    for f, loc, look in PATH:
        cam.location = loc; cam.keyframe_insert("location", frame=f)
        tgt.location = look; tgt.keyframe_insert("location", frame=f)
    sc.camera = cam

    for ob in root.children:
        lift = next((h for p, h in EXPLODE if ob.name.startswith(p)), 0)
        if not lift:
            continue
        z = ob.location.z
        ob.keyframe_insert("location", index=2, frame=EX0)
        ob.location.z = z + lift; ob.keyframe_insert("location", index=2, frame=EX1)
        ob.location.z = z

    sc.frame_start, sc.frame_end = 1, FRAMES
    sc.render.resolution_x, sc.render.resolution_y = 1120, 630
    sc.render.resolution_percentage = 100
    sc.cycles.samples = int(os.environ.get("CT16_SAMPLES", "20"))
    sc.cycles.use_denoising = True
    sc.render.use_persistent_data = True
    sc.render.image_settings.file_format = "JPEG"
    sc.render.image_settings.quality = 84
    sc.render.filepath = os.path.join(OUT, "f")
    return sc


if __name__ == "__main__":
    sc = setup()
    args = [a for a in sys.argv[1:] if a.isdigit()]
    if len(args) == 2:
        sc.frame_start, sc.frame_end = int(args[0]), int(args[1])
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BASE, "ct16_scroll.blend"))
    bpy.ops.render.render(animation=True)
