"""Build the editable Lab Quest gallery and compact, material-batched web assets.
Run with Blender --background --factory-startup --python this_file.
All design coordinates below are game x / vertical y / game z; coord() converts
to Blender Z-up so the glTF export arrives in Three.js without a custom rotation.
"""
import bpy, math, os, json, sys, argparse, subprocess, tempfile
from mathutils import Vector

parser=argparse.ArgumentParser()
parser.add_argument('--gltfpack',help='Optional gltfpack executable for a smaller, uncompressed web GLB')
options=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
bpy.context.preferences.filepaths.save_version=0

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSET=os.path.join(ROOT,'assets','environment')
PREVIEW=os.path.join(ROOT,'artifacts','first-person-lab')
os.makedirs(ASSET,exist_ok=True);os.makedirs(PREVIEW,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for data in list(bpy.data.materials):bpy.data.materials.remove(data)
scene=bpy.context.scene
ENV=bpy.data.collections.new('Electricity Gallery - web environment');scene.collection.children.link(ENV)
JAR=bpy.data.collections.new('Leyden Jar - reusable instrument');scene.collection.children.link(JAR)
PROXY=bpy.data.collections.new('Preserved bench references - not exported');scene.collection.children.link(PROXY)
current=ENV
def coord(x,y,z):return (x,-z,y)
def linear(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
def material(name,hexcolor,rough=.6,metal=0,alpha=1,emission=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    rgb=[linear(int(hexcolor[i:i+2],16)/255) for i in (1,3,5)]
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*rgb,alpha);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    p.inputs['Alpha'].default_value=alpha
    if alpha<1:
        if hasattr(m,'surface_render_method'):m.surface_render_method='DITHERED'
        p.inputs['IOR'].default_value=1.45
    if emission:p.inputs['Emission Color'].default_value=(*rgb,1);p.inputs['Emission Strength'].default_value=emission
    m.diffuse_color=(*rgb,alpha);return m
M={
 'plaster':material('01 Warm mineral plaster','#d7dfcd'),
 'teal':material('02 Deep eucalyptus cabinetry','#315f5c'),
 'wood':material('03 Warm oak','#b48b5e'),
 'top':material('04 Pale maple worktops','#dfc294'),
 'floor':material('05 Limestone tile','#d4c5aa'),
 'grout':material('06 Tile joints','#aea38d'),
 'brass':material('07 Satin brass','#d0ad69',.35,.52),
 'dark':material('08 Chalkboard enamel','#223f41'),
 'metal':material('09 Brushed aluminium','#b6c9cc',.27,.68),
 'glass':material('10 Frosted aqua glass','#b0ddda',.24,0,.25),
 'window':material('11 Daylight window','#a8d7d9',.3,0,1,.22),
 'light':material('12 Warm light diffuser','#fff0cc',.3,0,1,2.2),
 'navy':material('13 Ink blue','#355974'),
 'sage':material('14 Sage inlay','#7a9f8f'),
 'lavender':material('15 Dusty lilac','#9b8aaa'),
 'leaf':material('16 Botanical green','#4f8161'),
 'cream':material('17 Chalk ivory','#f0e8d2'),
 'rubber':material('18 Insulating dark rubber','#39474c'),
 'foil':material('19 Leyden foil','#c7cdd0',.28,.75),
}
def assign(o,name,mat):
    o.name=name
    for c in list(o.users_collection):c.objects.unlink(o)
    current.objects.link(o)
    if mat:o.data.materials.append(mat)
    return o
def box(name,w,h,d,x,y,z,mat,bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=coord(x,y,z));o=assign(bpy.context.object,name,mat)
    o.dimensions=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        b=o.modifiers.new('Soft manufactured edges','BEVEL');b.width=min(bevel,w/5,h/5,d/5);b.segments=2
    return o
def cylinder(name,r,h,x,y,z,mat,vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=coord(x,y,z));o=assign(bpy.context.object,name,mat)
    b=o.modifiers.new('Edge glint','BEVEL');b.width=.012;b.segments=2
    for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
    return o
def sphere(name,rx,ry,rz,x,y,z,mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=coord(x,y,z));o=assign(bpy.context.object,name,mat)
    o.scale=(rx,rz,ry);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for p in o.data.polygons:p.use_smooth=True
    return o
def tube(name,radius,points,mat):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=8;curve.bevel_depth=radius;curve.bevel_resolution=2
    spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
    for p,v in zip(spline.points,points):p.co=(*coord(*v),1)
    o=bpy.data.objects.new(name,curve);current.objects.link(o);o.data.materials.append(mat);return o
font=bpy.data.fonts.load('/System/Library/Fonts/STHeiti Medium.ttc')
def text(name,words,x,y,z,size,mat=M['cream']):
    data=bpy.data.curves.new(name,'FONT');data.body=words;data.font=font;data.align_x='CENTER';data.size=size;data.extrude=.002;data.resolution_u=3
    o=bpy.data.objects.new(name,data);current.objects.link(o);o.location=coord(x,y,z);o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(mat);return o
def table(name,x,z,w=4.2,d=1.8):
    box(name+' maple top',w,.15,d,x,1.70,z,M['top'],.055)
    box(name+' frame',w-.2,.28,d-.14,x,1.46,z,M['teal'])
    box(name+' rubber mat',w-.55,.025,d-.35,x,1.795,z,M['dark'],.07)
    for dx in [-w/2+.22,w/2-.22]:
        for dz in [-d/2+.20,d/2-.20]:box(name+' leg',.16,1.35,.16,x+dx,.69,z+dz,M['wood'])
    for dx in [-w*.24,w*.24]:
        box(name+' drawer',w*.43,.24,.06,x+dx,1.47,z+d/2-.025,M['teal'])
        box(name+' pull',.38,.035,.065,x+dx,1.48,z+d/2+.028,M['brass'])
def cabinet(name,x,z,w=5.4):
    box(name,w,1.8,.95,x,.9,z,M['teal'],.055);box(name+' worktop',w+.08,.10,1.01,x,1.86,z,M['top'])
    for i in range(6):
        xx=x-w/2+(i+.5)*w/6
        box(name+' door',w/6-.035,1.55,.04,xx,.89,z+.491,M['teal'])
        box(name+' handle',.03,.26,.035,xx+w/12-.1,1.16,z+.522,M['brass'])
    for i in range(4):
        xx=x-1.8+i*1.15
        cylinder(name+' sample jar',.15,.45,xx,2.12,z,M['glass'],20)
        cylinder(name+' sample lid',.16,.055,xx,2.38,z,M['brass'],20)
def zone(name,title,subtitle,x,z,color,w=4.8):
    box(name+' floor border',w,.014,3.9,x,.015,z+.3,M[color],.06)
    box(name+' floor field',w-.13,.016,3.77,x,.017,z+.3,M['floor'],.04)
    box(name+' sign',3.8,.78,.085,x,4.05,z-1.28,M['dark'],.07)
    box(name+' sign accent',.10,.67,.093,x-1.80,4.05,z-1.28,M[color])
    text(name+' title',title,x,4.04,z-1.22,.27)
    text(name+' subtitle',subtitle,x,3.78,z-1.22,.13,M['brass'])

# The complete interior is exported, not an open-front dollhouse.
box('Foundation',24.1,.20,14.1,0,-.12,0,M['wood'],.05)
box('Continuous floor',24,.035,14,0,-.015,0,M['floor'],0)
for x in range(-11,12,2):box('Floor joint X',.016,.005,13.96,x,.005,0,M['grout'],0)
for z in range(-6,7,2):box('Floor joint Z',23.96,.005,.016,0,.006,z,M['grout'],0)
for name,w,h,d,x,y,z in [('North wall',24,5.8,.20,0,2.9,-7),('West wall',.20,5.8,14,-12,2.9,0),('East wall',.20,5.8,14,12,2.9,0),('South wall left',10.4,5.8,.20,-6.8,2.9,7),('South wall right',10.4,5.8,.20,6.8,2.9,7),('Entrance lintel',3.2,1.8,.20,0,4.9,7)]:box(name,w,h,d,x,y,z,M['plaster'],.025)
for x in [-11.8,11.8]:box('Wall skirting side',.12,.35,13.8,x,.20,0,M['teal'])
for z in [-6.8,6.8]:box('Wall skirting end',23.6,.35,.12,0,.20,z,M['teal'])
for x in [-9,-3,3,9]:
    box('Window frame',3.8,2.5,.12,x,3.65,-6.86,M['wood'])
    box('Daylight glazing',3.58,2.28,.13,x,3.65,-6.77,M['window'])
    box('Window mullion',.07,2.32,.15,x,3.65,-6.68,M['cream'])
    box('Window crossbar',3.64,.07,.15,x,3.65,-6.68,M['cream'])
    box('Window sill',4,.10,.38,x,2.35,-6.65,M['top'])
for x in [-4.25,4.25]:
    for z,d in [(-5.15,3.3),(-.85,1.4)]:
        box('Gallery partition',.18,5.25,d,x,2.625,z,M['plaster'])
        box('Gallery partition footing',.23,.28,d,x,.15,z,M['teal'])
        box('Gallery partition rail',.23,.08,d,x,2.85,z,M['wood'])
    for z in [-3.45,-1.65]:box('Passage oak jamb',.26,4.6,.16,x,2.3,z,M['wood'])
    box('Passage header',.27,.18,1.94,x,4.65,-2.55,M['wood'])
for x in [-8,0,8]:
    box('Ceiling beam',.22,.35,13.8,x,5.55,0,M['wood'])
    for z in [-4.3,1.3,4.8]:
        box('Suspended task light',2.9,.12,.40,x,5.12,z,M['dark'])
        box('Light diffuser',2.68,.024,.31,x,5.045,z,M['light'])
        for dx in [-1.1,1.1]:cylinder('Suspension',.018,.35,x+dx,5.38,z,M['metal'],12)
for z in [-6.6,0,6.6]:box('Cross beam',23.7,.25,.17,0,5.65,z,M['wood'])
cabinet('Left research cabinet',-8.3,-6.15);cabinet('Right research cabinet',8.3,-6.15)
box('Equipment wardrobe',1.2,4.5,3,10.7,2.25,3.7,M['teal'],.05)
for z in [2.9,4.3]:
    box('Wardrobe glazed door',.045,3.4,1.25,10.075,2.45,z,M['glass'])
    box('Wardrobe vertical pull',.055,.55,.055,10.02,2.6,z-.44,M['brass'])
for x,z in [(-10.4,5.2),(9.2,5.5)]:
    cylinder('Terracotta planter',.48,.68,x,.35,z,M['wood']);cylinder('Planter rim',.52,.10,x,.70,z,M['brass'])
    for i in range(7):
        a=i*2.4;o=sphere('Broad leaf',.16,.48,.11,x+math.sin(a)*.23,1.04+math.cos(a)*.18,z+math.cos(a)*.20,M['leaf']);o.rotation_euler[1]=math.sin(a)*.52

zone('VanDeGraaff','01  炸毛之謎','同種電荷會互相推開？',-6.4,3.3,'sage',4.4)
zone('Friction','02  摩擦起電','電荷去哪裡？',-7,0,'navy',4.1)
zone('Balloon','03  氣球與黑板','中性物體也會被吸引？',-7,-4.4,'sage');table('Balloon desk',-7,-4.4,3.6,1.6)
box('Neutral blackboard',3.3,1.55,.10,-7,2.86,-5.13,M['dark'],.035)
box('Blackboard rail',3.5,.12,.23,-7,2.04,-5.1,M['wood'])
sphere('Uncharged balloon display',.40,.52,.37,-7.72,2.44,-4.28,M['brass'])
tube('Balloon string',.011,[(-7.72,1.93,-4.28),(-7.55,1.7,-4.23),(-7.61,1.42,-4.28)],M['cream'])
box('Folded sweater',.72,.12,.55,-6.45,1.87,-4.25,M['sage'],.08)
zone('Induction','04  感應起電','不碰，也會改變分布',0,-4.4,'navy');table('Induction desk',0,-4.4)
cylinder('Insulating stand',.25,.54,0,2.07,-4.4,M['rubber']);box('Metal conductor',1.25,.52,.50,0,2.61,-4.4,M['metal'],.10)
box('Inducing rod',1.18,.12,.13,-1.25,2.58,-4.3,M['navy'],.04)
zone('Contact','05  接觸起電','電荷會怎麼分享？',7,-4.4,'lavender');table('Contact desk',7,-4.4)
for x in [6.2,7.8]:
    cylinder('Sphere insulated support',.16,.50,x,2.05,-4.4,M['rubber'])
    cylinder('Sphere stand foot',.40,.08,x,1.83,-4.4,M['dark'])
    sphere('Equal metal sphere',.48,.48,.48,x,2.77,-4.4,M['metal'])
zone('Leyden','06  萊頓瓶','兩層金屬，中間隔著什麼？',7,0,'lavender');table('Leyden desk',7,0,3.6)
zone('Electroscope','07  驗電器探究','用金箔找證據',0,0,'teal',6.2)
# Stands for the runtime Van de Graaff and friction modules are intentionally
# absent from the web mesh, avoiding duplicate instruments and colliders.
box('Entrance welcome panel',3.2,.70,.08,0,4.20,6.82,M['teal'],.08)
text('Entrance inscription','電學實驗室',0,4.15,6.76,.35)

# Editable legacy bench reference: the runtime uses the original exact geometry.
current=PROXY;table('Legacy bench reference',0,0,5.6,1.85)
cylinder('Electroscope base reference',.56,.11,-.5,1.865,.18,M['dark'])
cylinder('Electroscope glass reference',.47,1.05,-.5,2.5,.18,M['glass'])
cylinder('Electroscope stem reference',.037,.63,-.5,2.715,.18,M['metal'])
cylinder('Electroscope plate reference',.37,.07,-.5,3.155,.18,M['metal'])
for x in [-.055,.055]:box('Foil reference',.11,.41,.009,-.5+x,2.195,.18,M['brass'],0)

# True Leyden jar: two separated foil shells, intervening glass and a terminal
# connected only to the INNER shell. Full / rear-half shells support a cutaway.
current=JAR
jar_root=bpy.data.objects.new('LeydenAssetRoot',None);JAR.objects.link(jar_root)
def shell(name,outer,inner,h,base,mat,half=False):
    n=32 if half else 64;span=math.pi if half else 2*math.pi
    verts=[]
    for r,y in [(outer,base),(outer,base+h),(inner,base),(inner,base+h)]:
        verts.extend((r*math.cos(span*i/n),r*math.sin(span*i/n),y) for i in range(n+1))
    faces=[];k=n+1
    for i in range(n):faces.extend([(i,i+1,k+i+1,k+i),(2*k+i,3*k+i,3*k+i+1,2*k+i+1),(i,2*k+i,2*k+i+1,i+1),(k+i,k+i+1,3*k+i+1,3*k+i)])
    faces.extend([(0,k,3*k,2*k),(n,2*k+n,3*k+n,k+n)])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);JAR.objects.link(o);o.data.materials.append(mat)
    for p in mesh.polygons:p.use_smooth=len(p.vertices)==4
    return o
cylinder('JarFoot',.80,.11,0,.055,0,M['wood'])
cylinder('GlassBottom',.68,.055,0,.145,0,M['glass'])
shell('GlassFull',.68,.63,1.62,.12,M['glass']);shell('GlassCutaway',.68,.63,1.62,.12,M['glass'],True)
shell('OuterFoilFull',.704,.685,1.10,.22,M['foil']);shell('OuterFoilCutaway',.704,.685,1.10,.22,M['foil'],True)
shell('InnerFoilFull',.625,.605,1.10,.22,M['foil']);shell('InnerFoilCutaway',.625,.605,1.10,.22,M['foil'],True)
cylinder('InsulatingStopper',.69,.13,0,1.78,0,M['rubber'])
cylinder('InnerMetalStem',.045,1.05,0,1.72,0,M['brass'])
sphere('TopMetalTerminal',.21,.21,.21,0,2.30,0,M['brass'])
tube('InnerConnection',.026,[(0,1.25,0),(.25,.88,-.28),(.615,.55,-.08)],M['brass'])
cylinder('OuterTerminal',.07,.15,.73,.88,0,M['brass'],20)
for o in list(JAR.objects):
    if o!=jar_root:o.parent=jar_root
    if 'Cutaway' in o.name:o.hide_render=True
jar_root.location=coord(7,1.80,0)

# Lights and two editable cameras also stay in the .blend source.
world=scene.world or bpy.data.worlds.new('Soft gallery daylight');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.40,.50,.54,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.7
def area(name,x,y,z,power,size):
    light=bpy.data.lights.new(name,'AREA');light.energy=power;light.shape='DISK';light.size=size
    o=bpy.data.objects.new(name,light);scene.collection.objects.link(o);o.location=coord(x,y,z)
for x in [-7,0,7]:
    for z in [-4,2]:area('Soft ceiling illumination',x,5.5,z,550,5)
def camera(name,location,look,lens):
    data=bpy.data.cameras.new(name);data.lens=lens;data.clip_end=200
    o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=coord(*location);target=Vector(coord(*look));o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler();return o
entry_camera=camera('First-person entry camera',(0,3.1,5.8),(0,2.8,-2.8),24)
plan_camera=camera('Cutaway architecture camera',(21,21,25),(0,1,0),38)
scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True
scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.camera=entry_camera
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ASSET,'electricity-gallery.blend'),compress=True)
scene.render.filepath=os.path.join(PREVIEW,'blender-entry.png');bpy.ops.render.render(write_still=True)
scene.camera=plan_camera
hidden=[]
for o in ENV.objects:
    if any(v in o.name for v in ['South wall','Entrance lintel','East wall','Ceiling beam','Cross beam','Suspended task','Light diffuser','Suspension']):o.hide_render=True;hidden.append(o)
scene.render.filepath=os.path.join(PREVIEW,'blender-plan.png');bpy.ops.render.render(write_still=True)
for o in hidden:o.hide_render=False

def select_only(objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.hide_set(False);o.select_set(True)
    if objects:bpy.context.view_layer.objects.active=objects[0]
def meshify(objects):
    select_only(objects);bpy.ops.object.convert(target='MESH')
    for o in list(bpy.context.selected_objects):
        bpy.context.view_layer.objects.active=o
        for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)

meshify([o for o in ENV.objects if o.type in ['MESH','FONT','CURVE']])
# Keep the editable .blend unjoined. Material batches exist only in exported GLB.
for mat in M.values():
    group=[o for o in ENV.objects if o.type=='MESH' and len(o.data.materials)==1 and o.data.materials[0]==mat]
    if len(group)>1:select_only(group);bpy.ops.object.join();bpy.context.object.name='EnvironmentBatch_'+mat.name
select_only(list(ENV.objects))
bpy.ops.export_scene.gltf(filepath=os.path.join(ASSET,'electricity-gallery.glb'),export_format='GLB',use_selection=True,export_apply=True,export_cameras=False,export_lights=False)
meshify([o for o in JAR.objects if o.type in ['MESH','CURVE']]);jar_root.location=(0,0,0)
select_only(list(JAR.objects))
bpy.ops.export_scene.gltf(filepath=os.path.join(ASSET,'leyden-jar.glb'),export_format='GLB',use_selection=True,export_apply=True,export_cameras=False,export_lights=False)
if options.gltfpack:
    with tempfile.TemporaryDirectory(prefix='lab-gallery-opt-') as temporary:
        optimized=os.path.join(temporary,'gallery.glb')
        source=os.path.join(ASSET,'electricity-gallery.glb')
        subprocess.run([options.gltfpack,'-i',source,'-o',optimized,'-si','0.6','-noq'],check=True)
        with open(optimized,'rb') as inp,open(source,'wb') as out:out.write(inp.read())
print('LAB_ASSETS',json.dumps({f:os.path.getsize(os.path.join(ASSET,f)) for f in ['electricity-gallery.blend','electricity-gallery.glb','leyden-jar.glb']}))
