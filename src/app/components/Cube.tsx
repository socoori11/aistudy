"use client";

import {
  useEffect,
  useRef
} from "react";

import * as THREE from "three";

import gsap from "gsap";

import styles from "./Cube.module.scss";


const Cube = () => {

  const boxRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!boxRef.current) {
      return;
    }


    // ==============================
    // Three.js 장면 만들기
    // ==============================
    const scene = new THREE.Scene(); // 3d 공간 만들기


    // ==============================
    // Three.js 카메라 보는 시점 만들기
    // ==============================
    const camera = new THREE.PerspectiveCamera( //카메라 보는 시점 만들기
        75, // 얼마나 넓게 볼 것인가
        300 / 200, // 화면의 가로 비율, 세로 비율
        0.1, // 여기보다 가까운 곳은 안보임
        1000 // 여기보다 먼 곳도 안보임
      );


    camera.position.z = 4; 
    // 카메라를 z축으로 4만큼 이동시킨다 각도는 gsap가 변형하므로 사각형만 보이는 시점이다


    // ==============================
    // Three.js 화면 만들기
    // ==============================
    
    //랜더 선언
    const renderer = new THREE.WebGLRenderer({ // 브라우져가 볼 수 있게 화면으로 그려주는 역활
        antialias: true, // 물체의 테두리를 부드럽게
        alpha: true // 배경을 투명하게 사용가능
      });

    // 랜더가 그릴 화면 크기
    renderer.setSize(
      300,
      200
    );

    // 설정된 랜더로 div안에 넣기
    boxRef.current.appendChild(
      renderer.domElement 
      // 렌더는 <canvas>라는 화면을 만들어 사용한다.
      // three.js가 만든 canvas화면을 이 div 안에 넣어
    );


    // ==============================
    // Three.js 정육면체 구현
    // ==============================

    const geometry = new THREE.BoxGeometry( // 박스 형태의 3d모양을 만드는것 
        1.5, // 가로
        1.5, // 세로
        1.5  // 깊이
      );

    // 도넛 모양
    // new THREE.TorusGeometry(
    //   1, 도넛 전체 반지름
    //   0.4, 도넛 관의 굵기
    //   16, 관을 얼마나 부드럽게 할지
    //   100 도덧 둘레를 얼마나 부드럽게 표현할지
    // );

    const material = new THREE.MeshNormalMaterial(); 
    // 면의 방향에 따라 자동으로 여러 색을 보여주는 재질
  /*
    // 1. 한 가지 색으로 단순하게 표현
    const material = new THREE.MeshBasicMaterial({
      color: "red"
    })
    
    // 2. 빛을 받는 일반적인 3D 재질
    const material = new THREE.MeshStandardMaterial({
      color: "red"
    });

          MeshStandardMaterial은 빛을 받으면 밝고 어두운 부분이 생기는 재질입니다. 
          그래서 입체감이 훨씬 자연스럽습니다.
          다만 이것을 사용하려면 보통 Light도 같이 만들어야 합니다.

          // 라이트를 만든다
          const light = new THREE.DirectionalLight("white", 3);

          // 라이트 위치를 정한다
          light.position.set(3, 3, 5);

          // 라이트를 3D 공간에 넣는다
          scene.add(light);

          scene.add(cube); 
          문장 아래에 넣는다


   // 3. 반짝이는 느낌의 재질 역시 라이트가 있어야 반짝이는 느낌을 가질 수 있다.
    const material = new THREE.MeshPhongMaterial({
      color: "red",
      shininess: 100
    });
   */
    const cube = new THREE.Mesh(
        geometry,
        material
      );


    scene.add(cube);

    // 여기에 라이트 추가

    // ==============================
    // GSAP 회전 구현
    // ==============================

    gsap.to(
      cube.rotation,
      {
        x: Math.PI * 2, // three.js는 디그리 아님, radian임 즉  Math.PI * 2  는 360도
        y: Math.PI * 2,

        duration: 5,
        repeat: -1, // 무한 반복
        ease: "none"
      }
    );


    // ==============================
    // Three.js 화면 반복 출력
    // ==============================

    let animationId = 0;


    const animate = () => {
      animationId =
        requestAnimationFrame(
          animate
        );


      renderer.render(
        scene,
        camera
      );

    };


    animate();


    // ==============================
    // 컴포넌트 종료시 정리
    // ==============================

    return () => {

      cancelAnimationFrame(
        animationId
      );


      geometry.dispose();
      material.dispose();
      renderer.dispose();


      renderer.domElement.remove();
    };

  }, []);


  return (

    <div
      ref={boxRef}
      className={styles.cube}
    />

  );

};

export default Cube;