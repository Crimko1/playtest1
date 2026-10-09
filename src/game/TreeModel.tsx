import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import tree from "@/assets/models/tree.glb.asset.json";
export function TreeModel(){const {scene}=useGLTF(tree.url);const object=useMemo(()=>{const o=scene.clone(true);const box=new THREE.Box3().setFromObject(o),size=box.getSize(new THREE.Vector3());o.scale.setScalar(4.6/Math.max(.01,size.y));o.position.y=-box.min.y*o.scale.y;o.traverse(n=>{if(n instanceof THREE.Mesh){n.castShadow=true;n.receiveShadow=true;}});return o;},[scene]);return <primitive object={object}/>;}