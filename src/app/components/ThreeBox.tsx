// 채팅 화면에 회전하는 3D 정육면체를 그립니다.
"use client";

import { useEffect, useRef } from "react";

import * as THREE from "three";

import styles from "./ThreeBox.module.scss";

const ThreeBox = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return;
    }

    // 3D 공간과 카메라, 화면을 그릴 도구를 준비합니다.
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

    camera.position.z = 4.2;
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    renderer.setClearColor(0x000000, 0);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    mount.appendChild(renderer.domElement);

    // 정육면체와 테두리를 만들어 3D 공간에 넣습니다.
    const geometry = new THREE.BoxGeometry(1.4, 1.4, 1.4);

    const material = new THREE.MeshNormalMaterial();

    const cube = new THREE.Mesh(geometry, material);

    scene.add(cube);
    cube.rotation.set(0.4, 0.6, 0);

    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.65,
    });
    cube.add(new THREE.LineSegments(edgesGeometry, edgesMaterial));

    // 화면 크기가 바뀌면 카메라 비율과 그림 크기를 맞춥니다.
    const handleResize = () => {
      const width = mount.clientWidth;

      const height = mount.clientHeight;

      if (width === 0 || height === 0) {
        return;
      }

      camera.aspect = width / height;

      camera.updateProjectionMatrix();

      renderer.setSize(width, height, false);

      renderer.render(scene, camera);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mount);

    // 지난 프레임부터 흐른 시간만큼 회전시켜 속도를 일정하게 유지합니다.
    let previousTime: number | null = null;
    renderer.setAnimationLoop((time) => {
      const delta = previousTime === null
        ? 0
        : Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      cube.rotation.x += delta * Math.PI / 8;
      cube.rotation.y += delta * Math.PI / 4;
      renderer.render(scene, camera);
    });

    return () => {
      // 화면을 벗어나면 애니메이션을 멈추고 그래픽 메모리를 정리합니다.
      resizeObserver.disconnect();

      renderer.setAnimationLoop(null);

      edgesGeometry.dispose();
      edgesMaterial.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={styles.threeOut}>
      <div ref={mountRef} className={styles.threeBox} aria-hidden="true" />
      <h2 className={styles.threeTitle}>LIVE CHAT</h2>
    </div>
  );
};

export default ThreeBox;
