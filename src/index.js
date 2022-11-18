// ThreeJS and Third-party deps
import * as THREE from "three"
import * as dat from 'dat.gui'
import Stats from "three/examples/jsm/libs/stats.module"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

// Core boilerplate code deps
import { createCamera, createComposer, createRenderer, runApp } from "./core-utils"
import gsap from "gsap"
import { screenToWorldSpace } from "./common-utils"

global.THREE = THREE

/**************************************************
 * 0. Tweakable parameters for the scene
 *************************************************/
const params = {
  // general scene params
  fogColor: 0x000000,
  fogNear: 4,
  fogFar: 12,
  blobColor: 0x00FFFF,
  blobNumber: 100,
  blobInitialPosMultiplier: 10,
  gsapDuration: 2.0, // this param controls the speed of which the blobs move, also affects the eventual moving patterns of the blobs
  followMouse: false,
}


/**************************************************
 * 1. Initialize core threejs components
 *************************************************/
// Create the scene
let scene = new THREE.Scene()

// Create the renderer via 'createRenderer',
// 1st param receives additional WebGLRenderer properties
// 2nd param receives a custom callback to further configure the renderer
let renderer = createRenderer({ antialias: false, alpha: false }, (_renderer) => {
  // e.g. uncomment below if you want the output to be in sRGB color space
  // _renderer.outputEncoding = THREE.sRGBEncoding
  _renderer.shadowMap.enabled = true
})

// Create the camera
// Pass in fov, near, far and camera position respectively
let camera = createCamera(35, 1, 100, { x: 0, y: 0, z: 8 })


/**************************************************
 * 2. Build your scene in this threejs app
 * This app object needs to consist of at least the async initScene() function (it is async so the animate function can wait for initScene() to finish before being called)
 * initScene() is called after a basic threejs environment has been set up, you can add objects/lighting to you scene in initScene()
 * if your app needs to animate things(i.e. not static), include a updateScene(interval, elapsed) function in the app as well
 *************************************************/
let app = {
  async initScene() {
    this.firstObjOffset = {
      x: 0,
      y: 0
    }

    // OrbitControls
    this.controls = new OrbitControls(camera, renderer.domElement)
    this.controls.enableDamping = true

    let gridHelper = new THREE.GridHelper(20, 20)
    gridHelper.position.y = -1
    scene.add(gridHelper)

    scene.fog = new THREE.Fog(params.fogNear, params.fogNear, params.fogFar)

    let geometry = new THREE.SphereGeometry(0.7, 32, 16)
    let material = new THREE.MeshBasicMaterial({
      color: params.blobColor
    })

    this.world = new THREE.Object3D();
    for (let i = 0; i < params.blobNumber; i++) {
      let blob = new THREE.Mesh(geometry, material)
      blob.castShadow = true
      blob.receiveShadow = true

      blob.position.x = -Math.random() * params.blobInitialPosMultiplier + Math.random() * params.blobInitialPosMultiplier
      blob.position.z = -Math.random() * params.blobInitialPosMultiplier + Math.random() * params.blobInitialPosMultiplier
      blob.position.y = -Math.random() * params.blobInitialPosMultiplier + Math.random() * params.blobInitialPosMultiplier
      let blob_scale = Math.random()
      blob.scale.set(blob_scale, blob_scale, blob_scale)
      if (i == 0) {
        blob.visible = false
        // blob.material.color = new THREE.Color(0xffff00)
        // blob.scale.set(2, 2, 2)
      }

      this.world.add(blob)
    }
    scene.add(this.world)

    // GUI controls
    const gui = new dat.GUI()
    gui.addColor(params, 'blobColor').onChange((val) => {
      material.color.set(val)
    })
    gui.add(params, "followMouse")

    // Stats - show fps
    this.stats1 = new Stats()
    this.stats1.showPanel(0) // Panel 0 = fps
    this.stats1.domElement.style.cssText = "position:absolute;top:0px;left:0px;"
    // this.container is the parent DOM element of the threejs canvas element
    this.container.appendChild(this.stats1.domElement)
  },
  // @param {number} interval - time elapsed between 2 frames
  // @param {number} elapsed - total time elapsed since app start
  updateScene(interval, elapsed) {
    this.controls.update()
    this.stats1.update()

    let first_obj = this.world.children[0]
    let mouseWorldSpace = screenToWorldSpace({ ...this.uniforms.u_mouse.value, z: 0 }, camera)
    let offset = {
      x: params.followMouse ? mouseWorldSpace.x : 0,
      y: params.followMouse ? mouseWorldSpace.y : 0,
    }
    first_obj.position.set(
      offset.x + Math.cos(elapsed * 2.0),
      offset.y + Math.sin(elapsed * 2.0),
      Math.sin(elapsed * 2.0)
    )

    for (let i = 0, l = this.world.children.length; i < l; i++) {
      var object = this.world.children[i]
      var object_left = this.world.children[i - 1]
      if (i >= 1) {
        gsap.to(object.position, {
          duration: params.gsapDuration,
          x: offset.x + Math.cos(object_left.position.x * 3),
          y: offset.y + Math.sin(object_left.position.y * 3),
          z: Math.cos(object_left.position.z * 3),
        })
      }
    }
  }
}

/**************************************************
 * 3. Run the app
 * 'runApp' will do most of the boilerplate setup code for you:
 * e.g. HTML container, window resize listener, mouse move/touch listener for shader uniforms, THREE.Clock() for animation
 * Executing this line puts everything together and runs the app
 * ps. if you don't use custom shaders, pass undefined to the 'uniforms'(2nd-last) param
 * ps. if you don't use post-processing, pass undefined to the 'composer'(last) param
 *************************************************/
runApp(app, scene, renderer, camera, true, undefined, undefined)
