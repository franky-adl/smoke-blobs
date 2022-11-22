import * as THREE from "three"
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader"

global.THREE = THREE

/**
 * 
 * @param {string} hex hex string without or without # prefix
 * @param {bool} forShaders if true, r,g,b components will be in 0..1 range
 * @returns an object with r,g,b components
 */
export const hexToRgb = (hex, forShaders = false) => {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (forShaders) {
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : null;
    }
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * @param {string} url - Path to equirectandular .hdr
 * @returns {Promise<THREE.Texture>}
 */
export const loadHDRI = (url) => {
    return new Promise((resolve) => {
        const hdrEquirect = new RGBELoader().load(url, function () {
            hdrEquirect.mapping = THREE.EquirectangularReflectionMapping
            resolve(hdrEquirect)
        })
    })
}

/**
 * https://www.prowaretech.com/articles/current/javascript/three-js/cover-scene-background-with-image#!
 * Setting background for threejs that doesn't stretch
 * @param {*} scene
 * @param {*} backgroundImageWidth
 * @param {*} backgroundImageHeight
 */
export const maintainBgAspect = (scene, backgroundImageWidth, backgroundImageHeight) => {
    var windowSize = function (withScrollBar) {
        var wid = 0
        var hei = 0
        if (typeof window.innerWidth != "undefined") {
            wid = window.innerWidth
            hei = window.innerHeight
        } else {
            if (document.documentElement.clientWidth == 0) {
                wid = document.body.clientWidth
                hei = document.body.clientHeight
            } else {
                wid = document.documentElement.clientWidth
                hei = document.documentElement.clientHeight
            }
        }
        return { width: wid - (withScrollBar ? wid - document.body.offsetWidth + 1 : 0), height: hei }
    }

    if (scene.background) {
        var size = windowSize(true)
        var factor = backgroundImageWidth / backgroundImageHeight / (size.width / size.height)

        scene.background.offset.x = factor > 1 ? (1 - 1 / factor) / 2 : 0
        scene.background.offset.y = factor > 1 ? 0 : (1 - factor) / 2

        scene.background.repeat.x = factor > 1 ? 1 / factor : 1
        scene.background.repeat.y = factor > 1 ? 1 : factor
    }
}

/**
 * This function transforms screen coordinates into world space coordinates at z plane specified by targetZ
 * 
 * Originally from: https://stackoverflow.com/questions/13055214/mouse-canvas-x-y-to-three-js-world-x-y-z
 * To understand "View Space" and "Clip Space", read https://learnopengl.com/Getting-started/Coordinate-Systems
 * 
 * @param {object} screenCoord in {x: number, y: number} form, usually from mouse coordinates in the window
 * @param {number} targetZ the target z position of the transformed point in world space
 * @param {object} camera the camera currently in use with the scene
 */
export const screenToWorldSpace = (screenCoord, targetZ, camera) => {
    var vec = new THREE.Vector3() // vector we use to do the calculations
    var pos = new THREE.Vector3() // holder for the final vector position we want

    // 1. transforming screen space back to clip space
    vec.set(
        (screenCoord.x / window.innerWidth) * 2 - 1,
        - (screenCoord.y / window.innerHeight) * 2 + 1,
        0.5 // could be anything in this range: -1.0 < value < 1.0, because that doesn't affect the calculated outcome
    )

    // 2. transforming clip space back to view space,
    // now vec is already pointed at the actual world space coordinates "directly underneath" the screen coordinates
    // you could take this as the result if you don't care about the z value of vec
    // but if you want the point to be placed at a specific z, continue the rest of the calculations
    vec.unproject(camera)

    // 3. get vec to point from the camera position to the world space point, and normalize it
    vec.sub(camera.position).normalize()

    // 4. calculate the distance ratio needed for our vec to "get" to the target point with targetZ
    var distanceRatio = (targetZ - camera.position.z) / vec.z

    // 5. extend the normalized vec until it reaches the target Z plane
    // finally we have a pos that is exactly where the original screen coordinates are and with a z value that matches the targetZ
    pos.copy(camera.position).add(vec.multiplyScalar(distanceRatio))

    return pos
}