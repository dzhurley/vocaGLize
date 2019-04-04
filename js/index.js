const props = {
    scaler: 0.1,
    rotationRate: 32,
    timeMultiplier: 10,
    smoothing: 0.9,
    shapeSpin: 140,
    shapeScaler: 128 };


const gui = new dat.GUI();
gui.add(props, 'scaler', 0, 2).step(0.1);
gui.add(props, 'rotationRate', 2, 64).step(2);
gui.add(props, 'timeMultiplier', 5, 50).step(5);
gui.add(props, 'smoothing', 0.5, 1).step(0.01);
gui.add(props, 'shapeSpin', 20, 500).step(20);
gui.add(props, 'shapeScaler', 16, 256).step(16);

const clock = new THREE.Clock();

// set up shader uniforms
const uniforms = {
    time: { value: 1.0 },
    resolution: { value: new THREE.Vector2() } };

const vertexShader = document.querySelector('.vertex').textContent;
const fragmentShader = document.querySelector('.fragment').textContent;

// all the shapes!
const geometries = [
    new THREE.BoxBufferGeometry(50, 50, 50),
    new THREE.CircleBufferGeometry(),
    new THREE.CircleBufferGeometry(3),
    new THREE.ConeBufferGeometry(),
    new THREE.CylinderBufferGeometry(),
    new THREE.DodecahedronBufferGeometry(50),
    new THREE.IcosahedronBufferGeometry(50),
    new THREE.OctahedronBufferGeometry(50),
    new THREE.PlaneBufferGeometry(20, 20),
    new THREE.RingBufferGeometry(40),
    new THREE.RingBufferGeometry(40, 60, 3),
    new THREE.SphereBufferGeometry(),
    new THREE.SphereBufferGeometry(50, 3, 2, 0, Math.PI * 2, 1, Math.PI * 2),
    new THREE.TetrahedronBufferGeometry(50),
    new THREE.TorusBufferGeometry(50),
    new THREE.TorusKnotBufferGeometry(50)];

const shapes = new THREE.Group();

// base audio setup
let source;
const context = new AudioContext();

// tune in an analyser to the mic
const analyser = context.createAnalyser();
analyser.fftSize = 512;
analyser.minDecibels = -90;
analyser.maxDecibels = -10;
analyser.smoothingTimeConstant = props.smoothing;
// set up catch for loading frequency data
const frequency = new Uint8Array(analyser.frequencyBinCount);

// connect to mic
navigator.mediaDevices.
    getUserMedia({ audio: true }).
    then(stream => {
        source = context.createMediaStreamSource(stream);
        source.connect(analyser);
    }).
    catch(() => {
        const micInfo = document.createElement('section');
        micInfo.classList.add('mic-info');
        // make sure it's https!
        micInfo.innerHTML = `It's dangerous to go insecure, take <a href="https://codepen.io/dzhurley/full/mmbjLM" target="_blank">this</a>!`;
        document.body.append(micInfo);
    });

const addShapes = scene => {
    // add tons of shapes to the scene 
    for (let i = 0; i < 1024; i++) {
        // pick a random shape to add
        let choice = Math.floor(Math.random() * geometries.length);
        let shape = new THREE.Mesh(
            geometries[choice],
            new THREE.ShaderMaterial({
                // vary color offsets in shader based on index of geometry
                uniforms: { ...uniforms, choice: { value: choice } },
                vertexShader,
                fragmentShader,
                vertexColors: THREE.FaceColors }));


        // randomly position and rotate
        shape.position.set(
            Math.floor(Math.random() * 6000 - 3000),
            Math.floor(Math.random() * 6000 - 3000),
            Math.floor(Math.random() * 6000 - 3000));

        shape.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI);


        // collect onto group
        shapes.add(shape);
    }
    scene.add(shapes);

    // animation loop run in requestAnimationFrame
    return () => {
        const sine = Math.abs(Math.sin(clock.elapsedTime) + 2) / props.shapeSpin;
        shapes.children.map(shape => {
            // keep 'em rotating
            shape.rotation.x += Math.random() * sine;
            shape.rotation.y -= Math.random() * sine;
            shape.rotation.z += Math.random() * sine;

            // sample range of frequency for geometry scaling based on
            // current shape index, so certain groups of shapes only
            // respond to certain ranges of frequency changes
            let index = geometries.indexOf(shape.geometry);
            let average = index % 2 ?
                frequency[index - 1] + frequency[index] / 2 :
                frequency[index] + frequency[index + 1] / 2;
            let scaled = props.scaler + average / props.shapeScaler;
            shape.scale.set(scaled, scaled, scaled);
        });
    };
};

// base three.js setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x171717);

const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(75, aspect, 100, 9000);
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

const animateShapes = addShapes(scene);

const animate = () => {
    const delta = clock.getDelta();
    uniforms.time.value += delta * props.timeMultiplier;

    // update audio data based on mic input and render shapes accordingly
    analyser.getByteFrequencyData(frequency);
    animateShapes(delta);

    // tilt the camera around
    camera.rotation.x += delta / props.rotationRate;
    camera.rotation.y -= delta / props.rotationRate;
    camera.rotation.z += delta / props.rotationRate;

    analyser.smoothingTimeConstant = props.smoothing;

    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
};

document.body.appendChild(renderer.domElement);
animate();
