(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,97603,70456,e=>{"use strict";var t=e.i(47662);let r="bonesDeclaration",i=`#if NUM_BONE_INFLUENCERS>0
#ifndef USE_VERTEX_PULLING
attribute matricesIndices : vec4f;attribute matricesWeights : vec4f;
#if NUM_BONE_INFLUENCERS>4
attribute matricesIndicesExtra : vec4f;attribute matricesWeightsExtra : vec4f;
#endif
#endif
#ifndef BAKED_VERTEX_ANIMATION_TEXTURE
#ifdef BONETEXTURE
var boneSampler : texture_2d<f32>;uniform boneTextureInfo : vec2f;
#else
uniform mBones : array<mat4x4f,BonesPerMesh>;
#endif
#ifdef BONES_VELOCITY_ENABLED
uniform mPreviousBones : array<mat4x4f,BonesPerMesh>;
#endif
#ifdef BONETEXTURE
fn readMatrixFromRawSampler(smp : texture_2d<f32>,index : f32)->mat4x4f
{let offset=i32(index)*4; 
let textureWidth=i32(uniforms.boneTextureInfo.x);let y=offset/textureWidth;let x=offset % textureWidth;let m0=textureLoad(smp,vec2<i32>(x+0,y),0);let m1=textureLoad(smp,vec2<i32>(x+1,y),0);let m2=textureLoad(smp,vec2<i32>(x+2,y),0);let m3=textureLoad(smp,vec2<i32>(x+3,y),0);return mat4x4f(m0,m1,m2,m3);}
#endif
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[r]||(t.f.IncludesShadersStoreWGSL[r]=i),e.s(["f",0,{name:r,shader:i}],97603);let f="bakedVertexAnimationDeclaration",n=`#ifdef BAKED_VERTEX_ANIMATION_TEXTURE
uniform bakedVertexAnimationTime: f32;uniform bakedVertexAnimationSettings: vec4<f32>;var bakedVertexAnimationTexture : texture_2d<f32>;
#ifdef INSTANCES
attribute bakedVertexAnimationSettingsInstanced : vec4<f32>;
#endif
fn readMatrixFromRawSamplerVAT(smp : texture_2d<f32>,index : f32,frame : f32)->mat4x4<f32>
{let offset=i32(index)*4;let frameUV=i32(frame);let m0=textureLoad(smp,vec2<i32>(offset+0,frameUV),0);let m1=textureLoad(smp,vec2<i32>(offset+1,frameUV),0);let m2=textureLoad(smp,vec2<i32>(offset+2,frameUV),0);let m3=textureLoad(smp,vec2<i32>(offset+3,frameUV),0);return mat4x4<f32>(m0,m1,m2,m3);}
#endif
`;t.f.IncludesShadersStoreWGSL[f]||(t.f.IncludesShadersStoreWGSL[f]=n),e.s(["f",0,{name:f,shader:n}],70456)},19874,e=>{"use strict";var t=e.i(47662);let r="bumpVertex",i=`#if defined(BUMP) || defined(PARALLAX) || defined(CLEARCOAT_BUMP) || defined(ANISOTROPIC)
#if defined(TANGENT) && defined(NORMAL)
var tbnNormal: vec3f=normalize(normalUpdated);var tbnTangent: vec3f=normalize(tangentUpdated.xyz);var tbnBitangent: vec3f=cross(tbnNormal,tbnTangent)*tangentUpdated.w;var matTemp= mat3x3f(finalWorld[0].xyz,finalWorld[1].xyz,finalWorld[2].xyz)* mat3x3f(tbnTangent,tbnBitangent,tbnNormal);vertexOutputs.vTBN0=matTemp[0];vertexOutputs.vTBN1=matTemp[1];vertexOutputs.vTBN2=matTemp[2];
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[r]||(t.f.IncludesShadersStoreWGSL[r]=i),e.s(["f",0,{name:r,shader:i}])},5214,e=>{"use strict";var t=e.i(47662);let r="bumpVertexDeclaration",i=`#if defined(BUMP) || defined(PARALLAX) || defined(CLEARCOAT_BUMP) || defined(ANISOTROPIC)
#if defined(TANGENT) && defined(NORMAL) 
varying vTBN0: vec3f;varying vTBN1: vec3f;varying vTBN2: vec3f;
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[r]||(t.f.IncludesShadersStoreWGSL[r]=i),e.s(["f",0,{name:r,shader:i}])},22352,5748,e=>{"use strict";var t=e.i(47662);let r="clipPlaneVertexDeclaration",i=`#ifdef CLIPPLANE
uniform vClipPlane: vec4<f32>;varying fClipDistance: f32;
#endif
#ifdef CLIPPLANE2
uniform vClipPlane2: vec4<f32>;varying fClipDistance2: f32;
#endif
#ifdef CLIPPLANE3
uniform vClipPlane3: vec4<f32>;varying fClipDistance3: f32;
#endif
#ifdef CLIPPLANE4
uniform vClipPlane4: vec4<f32>;varying fClipDistance4: f32;
#endif
#ifdef CLIPPLANE5
uniform vClipPlane5: vec4<f32>;varying fClipDistance5: f32;
#endif
#ifdef CLIPPLANE6
uniform vClipPlane6: vec4<f32>;varying fClipDistance6: f32;
#endif
`;t.f.IncludesShadersStoreWGSL[r]||(t.f.IncludesShadersStoreWGSL[r]=i),e.s(["f",0,{name:r,shader:i}],22352);let f="clipPlaneVertex",n=`#ifdef CLIPPLANE
vertexOutputs.fClipDistance=dot(worldPos,uniforms.vClipPlane);
#endif
#ifdef CLIPPLANE2
vertexOutputs.fClipDistance2=dot(worldPos,uniforms.vClipPlane2);
#endif
#ifdef CLIPPLANE3
vertexOutputs.fClipDistance3=dot(worldPos,uniforms.vClipPlane3);
#endif
#ifdef CLIPPLANE4
vertexOutputs.fClipDistance4=dot(worldPos,uniforms.vClipPlane4);
#endif
#ifdef CLIPPLANE5
vertexOutputs.fClipDistance5=dot(worldPos,uniforms.vClipPlane5);
#endif
#ifdef CLIPPLANE6
vertexOutputs.fClipDistance6=dot(worldPos,uniforms.vClipPlane6);
#endif
`;t.f.IncludesShadersStoreWGSL[f]||(t.f.IncludesShadersStoreWGSL[f]=n),e.s(["f",0,{name:f,shader:n}],5748)},62549,4340,31343,e=>{"use strict";var t=e.i(47662);let r="fogVertexDeclaration",i=`#ifdef FOG
varying vFogDistance: vec3f;
#endif
`;t.f.IncludesShadersStoreWGSL[r]||(t.f.IncludesShadersStoreWGSL[r]=i),e.s(["f",0,{name:r,shader:i}],62549);let f="fogVertex",n=`#ifdef FOG
#ifdef SCENE_UBO
vertexOutputs.vFogDistance=(scene.view*worldPos).xyz;
#else
vertexOutputs.vFogDistance=(uniforms.view*worldPos).xyz;
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[f]||(t.f.IncludesShadersStoreWGSL[f]=n),e.s(["f",0,{name:f,shader:n}],4340);let a="logDepthVertex",d=`#ifdef LOGARITHMICDEPTH
vertexOutputs.vFragmentDepth=1.0+vertexOutputs.position.w;vertexOutputs.position.z=log2(max(0.000001,vertexOutputs.vFragmentDepth))*uniforms.logarithmicDepthConstant;
#endif
`;t.f.IncludesShadersStoreWGSL[a]||(t.f.IncludesShadersStoreWGSL[a]=d),e.s(["f",0,{name:a,shader:d}],31343)},64500,e=>{"use strict";var t=e.i(47662);let r="helperFunctions",i=`const PI: f32=3.1415926535897932384626433832795;const TWO_PI: f32=6.283185307179586;const HALF_PI: f32=1.5707963267948966;const RECIPROCAL_PI: f32=0.3183098861837907;const RECIPROCAL_PI2: f32=0.15915494309189535;const RECIPROCAL_PI4: f32=0.07957747154594767;const HALF_MIN: f32=5.96046448e-08; 
const LinearEncodePowerApprox: f32=2.2;const GammaEncodePowerApprox: f32=1.0/LinearEncodePowerApprox;const LuminanceEncodeApprox: vec3f=vec3f(0.2126,0.7152,0.0722);const Epsilon:f32=0.0000001;fn square(x: f32)->f32 {return x*x;}
fn saturate(x: f32)->f32 {return clamp(x,0.0,1.0);}
fn saturateVec3(x: vec3f)->vec3f {return clamp(x,vec3f(),vec3f(1.0));}
fn saturateEps(x: f32)->f32 {return clamp(x,Epsilon,1.0);}
fn maxEps(x: f32)->f32 {return max(x,Epsilon);}
fn maxEpsVec3(x: vec3f)->vec3f {return max(x,vec3f(Epsilon));}
fn absEps(x: f32)->f32 {return abs(x)+Epsilon;}
fn transposeMat3(inMatrix: mat3x3f)->mat3x3f {let i0: vec3f=inMatrix[0];let i1: vec3f=inMatrix[1];let i2: vec3f=inMatrix[2];let outMatrix:mat3x3f=mat3x3f(
vec3(i0.x,i1.x,i2.x),
vec3(i0.y,i1.y,i2.y),
vec3(i0.z,i1.z,i2.z)
);return outMatrix;}
fn inverseMat3(inMatrix: mat3x3f)->mat3x3f {let a00: f32=inMatrix[0][0];let a01: f32=inMatrix[0][1];let a02: f32=inMatrix[0][2];let a10: f32=inMatrix[1][0];let a11: f32=inMatrix[1][1];let a12: f32=inMatrix[1][2];let a20: f32=inMatrix[2][0];let a21: f32=inMatrix[2][1];let a22: f32=inMatrix[2][2];let b01: f32=a22*a11-a12*a21;let b11: f32=-a22*a10+a12*a20;let b21: f32=a21*a10-a11*a20;let det: f32=a00*b01+a01*b11+a02*b21;return mat3x3f(b01/det,(-a22*a01+a02*a21)/det,(a12*a01-a02*a11)/det,
b11/det,(a22*a00-a02*a20)/det,(-a12*a00+a02*a10)/det,
b21/det,(-a21*a00+a01*a20)/det,(a11*a00-a01*a10)/det);}
#if USE_EXACT_SRGB_CONVERSIONS
fn toLinearSpaceExact(color: vec3f)->vec3f
{let nearZeroSection: vec3f=0.0773993808*color;let remainingSection: vec3f=pow(0.947867299*(color+vec3f(0.055)),vec3f(2.4));return select(remainingSection,nearZeroSection,color<=vec3f(0.04045));}
fn toGammaSpaceExact(color: vec3f)->vec3f
{let nearZeroSection: vec3f=12.92*color;let remainingSection: vec3f=1.055*pow(color,vec3f(0.41666))-vec3f(0.055);return select(remainingSection,nearZeroSection,color<=vec3f(0.0031308));}
#endif
fn toLinearSpace(color: f32)->f32
{
#if USE_EXACT_SRGB_CONVERSIONS
var nearZeroSection=0.0773993808*color;var remainingSection=pow(0.947867299*(color+0.055),2.4);return select(remainingSection,nearZeroSection,color<=0.04045);
#else
return pow(color,LinearEncodePowerApprox);
#endif
}
fn toLinearSpaceVec3(color: vec3f)->vec3f
{
#if USE_EXACT_SRGB_CONVERSIONS
return toLinearSpaceExact(color);
#else
return pow(color,vec3f(LinearEncodePowerApprox));
#endif
}
fn toLinearSpaceVec4(color: vec4<f32>)->vec4<f32>
{
#if USE_EXACT_SRGB_CONVERSIONS
return vec4f(toLinearSpaceExact(color.rgb),color.a);
#else
return vec4f(pow(color.rgb,vec3f(LinearEncodePowerApprox)),color.a);
#endif
}
fn toGammaSpace(color: vec4<f32>)->vec4<f32>
{
#if USE_EXACT_SRGB_CONVERSIONS
return vec4<f32>(toGammaSpaceExact(color.rgb),color.a);
#else
return vec4<f32>(pow(color.rgb,vec3f(GammaEncodePowerApprox)),color.a);
#endif
}
fn toGammaSpaceVec3(color: vec3f)->vec3f
{
#if USE_EXACT_SRGB_CONVERSIONS
return toGammaSpaceExact(color);
#else
return pow(color,vec3f(GammaEncodePowerApprox));
#endif
}
fn squareVec3(value: vec3f)->vec3f
{return value*value;}
fn pow5(value: f32)->f32 {let sq: f32=value*value;return sq*sq*value;}
fn double_refract(I: vec3f,N: vec3f,eta: f32)->vec3f {let Tfront: vec3f=refract(I,N,1.0/eta);let Nback: vec3f=normalize(reflect(N,Tfront));return refract(Tfront,-Nback,eta);}
fn getLuminanceUnclamped(color: vec3f)->f32
{return dot(color,LuminanceEncodeApprox);}
fn getLuminance(color: vec3f)->f32
{return saturate(getLuminanceUnclamped(color));}
fn getRand(seed: vec2<f32>)->f32 {return fract(sin(dot(seed.xy ,vec2<f32>(12.9898,78.233)))*43758.5453);}
fn dither(seed: vec2<f32>,varianceAmount: f32)->f32 {let rand: f32=getRand(seed);let normVariance: f32=varianceAmount/255.0;let dither: f32=mix(-normVariance,normVariance,rand);return dither;}
const rgbdMaxRange: f32=255.0;fn toRGBD(color: vec3f)->vec4<f32> {let maxRGB: f32=max(max(color.r,max(color.g,color.b)),Epsilon);var D: f32 =max(rgbdMaxRange/maxRGB,1.);D =clamp(floor(D)/255.0,0.,1.);var rgb: vec3f =color.rgb*D;rgb=toGammaSpaceVec3(rgb);return vec4<f32>(saturateVec3(rgb),D);}
fn fromRGBD(rgbd: vec4<f32>)->vec3f {let rgb=toLinearSpaceVec3(rgbd.rgb);return rgb/rgbd.a;}
fn parallaxCorrectNormal(vertexPos: vec3f,origVec: vec3f,cubeSize: vec3f,cubePos: vec3f)->vec3f {let invOrigVec: vec3f=vec3f(1.)/origVec;let halfSize: vec3f=cubeSize*0.5;let intersecAtMaxPlane: vec3f=(cubePos+halfSize-vertexPos)*invOrigVec;let intersecAtMinPlane: vec3f=(cubePos-halfSize-vertexPos)*invOrigVec;let largestIntersec: vec3f=max(intersecAtMaxPlane,intersecAtMinPlane);let distance: f32=min(min(largestIntersec.x,largestIntersec.y),largestIntersec.z);let intersectPositionWS: vec3f=vertexPos+origVec*distance;return intersectPositionWS-cubePos;}
fn equirectangularToCubemapDirection(uv : vec2f)->vec3f {var longitude : f32=uv.x*TWO_PI-PI;var latitude : f32=HALF_PI-uv.y*PI;var direction : vec3f;direction.x=cos(latitude)*sin(longitude);direction.y=sin(latitude);direction.z=cos(latitude)*cos(longitude);return direction;}
fn sqrtClamped(value: f32)->f32 {return sqrt(max(value,0.));}
fn avg(value: vec3f)->f32 {return dot(value,vec3f(0.333333333));}
fn singleScatterToMultiScatterAlbedo(rho_ss: vec3f)->vec3f {let s: vec3f=sqrt(max(vec3f(1.0)-rho_ss,vec3f(0.0)));return (vec3f(1.0)-s)*(vec3f(1.0)-vec3f(0.139)*s)/(vec3f(1.0)+vec3f(1.17)*s);}
fn multiScatterToSingleScatterAlbedo(rho_ms: vec3f)->vec3f {let s: vec3f=4.09712f+4.20863f*rho_ms-sqrt(9.59217f+41.6808f*rho_ms+17.7126f*rho_ms*rho_ms);return 1.0f-s*s;}
fn multiScatterToSingleScatterAlbedoWithAniso(rho_ms: vec3f,aniso: f32)->vec3f {let s: vec3f=4.09712+4.20863f*rho_ms-sqrt(9.59217f+41.6808f*rho_ms+17.7126f*rho_ms*rho_ms);return (vec3f(1.0f)-s*s)/maxEpsVec3(vec3f(1.0f)-vec3f(aniso)*s*s);}
fn min3(v: vec3f)->f32 {return min(v.x,min(v.y,v.z));}
fn max3(v: vec3f)->f32 {return max(v.x,max(v.y,v.z));}
fn uint2float(i: u32)->f32 {return bitcast<f32>(0x3F800000u | (i>>9u))-1.0;}
fn plasticSequence(rstate: u32)->vec2f {return vec2f(uint2float(rstate*3242174889u),
uint2float(rstate*2447445414u));}
`;t.f.IncludesShadersStoreWGSL[r]||(t.f.IncludesShadersStoreWGSL[r]=i),e.s(["f",0,{name:r,shader:i}])},33077,e=>{"use strict";var t=e.i(47662);let r="instancesDeclaration",i=`#ifdef INSTANCES
attribute world0 : vec4<f32>;attribute world1 : vec4<f32>;attribute world2 : vec4<f32>;attribute world3 : vec4<f32>;
#ifdef INSTANCESCOLOR
attribute instanceColor : vec4<f32>;
#endif
#if defined(THIN_INSTANCES) && !defined(WORLD_UBO)
uniform world : mat4x4<f32>;
#endif
#if defined(VELOCITY) || defined(PREPASS_VELOCITY) || defined(PREPASS_VELOCITY_LINEAR) || defined(VELOCITY_LINEAR)
attribute previousWorld0 : vec4<f32>;attribute previousWorld1 : vec4<f32>;attribute previousWorld2 : vec4<f32>;attribute previousWorld3 : vec4<f32>;
#ifdef THIN_INSTANCES
uniform previousWorld : mat4x4<f32>;
#endif
#endif
#else
#if !defined(WORLD_UBO)
uniform world : mat4x4<f32>;
#endif
#if defined(VELOCITY) || defined(PREPASS_VELOCITY) || defined(PREPASS_VELOCITY_LINEAR) || defined(VELOCITY_LINEAR)
uniform previousWorld : mat4x4<f32>;
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[r]||(t.f.IncludesShadersStoreWGSL[r]=i),e.s(["f",0,{name:r,shader:i}])},47193,e=>{"use strict";var t=e.i(47662);let r="logDepthDeclaration",i=`#ifdef LOGARITHMICDEPTH
uniform logarithmicDepthConstant: f32;varying vFragmentDepth: f32;
#endif
`;t.f.IncludesShadersStoreWGSL[r]||(t.f.IncludesShadersStoreWGSL[r]=i),e.s(["f",0,{name:r,shader:i}])},72033,e=>{"use strict";var t=e.i(47662);let r="mainUVVaryingDeclaration",i=`#ifdef MAINUV{X}
varying vMainUV{X}: vec2f;
#endif
`;t.f.IncludesShadersStoreWGSL[r]||(t.f.IncludesShadersStoreWGSL[r]=i),e.s(["f",0,{name:r,shader:i}])},80239,e=>{"use strict";var t=e.i(47662);let r="meshUboDeclaration",i=`struct Mesh {world : mat4x4<f32>,
visibility : f32,};var<uniform> mesh : Mesh;
#define WORLD_UBO
`;t.f.IncludesShadersStoreWGSL[r]||(t.f.IncludesShadersStoreWGSL[r]=i),e.s(["f",0,{name:r,shader:i}])},34091,47232,93828,31752,26106,e=>{"use strict";var t=e.i(47662);let r="morphTargetsVertexGlobal",i=`#ifdef MORPHTARGETS
#ifdef MORPHTARGETS_TEXTURE
var vertexID : f32;
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[r]||(t.f.IncludesShadersStoreWGSL[r]=i),e.s(["f",0,{name:r,shader:i}],34091);let f="morphTargetsVertex",n=`#ifdef MORPHTARGETS
#ifdef MORPHTARGETS_TEXTURE
#if {X}==0
for (var i=0; i<NUM_MORPH_INFLUENCERS; i=i+1) {if (f32(i)>=uniforms.morphTargetCount) {break;}
#ifdef USE_VERTEX_PULLING
vertexID=f32(vpVertexIndex)*uniforms.morphTargetTextureInfo.x;
#else
vertexID=f32(vertexInputs.vertexIndex)*uniforms.morphTargetTextureInfo.x;
#endif
#ifdef MORPHTARGETS_POSITION
#ifdef USE_VERTEX_PULLING
positionUpdated=positionUpdated+(readVector3FromRawSampler(i,vertexID)-vp_basePosition)*uniforms.morphTargetInfluences[i];
#else
positionUpdated=positionUpdated+(readVector3FromRawSampler(i,vertexID)-vertexInputs.position)*uniforms.morphTargetInfluences[i];
#endif
#endif
#ifdef MORPHTARGETTEXTURE_HASPOSITIONS
vertexID=vertexID+1.0;
#endif
#ifdef MORPHTARGETS_NORMAL
#ifdef USE_VERTEX_PULLING
normalUpdated=normalUpdated+(readVector3FromRawSampler(i,vertexID) -vp_baseNormal)*uniforms.morphTargetInfluences[i];
#else
normalUpdated=normalUpdated+(readVector3FromRawSampler(i,vertexID) -vertexInputs.normal)*uniforms.morphTargetInfluences[i];
#endif
#endif
#ifdef MORPHTARGETTEXTURE_HASNORMALS
vertexID=vertexID+1.0;
#endif
#ifdef MORPHTARGETS_UV
#ifdef USE_VERTEX_PULLING
uvUpdated=uvUpdated+(readVector3FromRawSampler(i,vertexID).xy-vp_baseUV)*uniforms.morphTargetInfluences[i];
#else
uvUpdated=uvUpdated+(readVector3FromRawSampler(i,vertexID).xy-vertexInputs.uv)*uniforms.morphTargetInfluences[i];
#endif
#endif
#ifdef MORPHTARGETTEXTURE_HASUVS
vertexID=vertexID+1.0;
#endif
#ifdef MORPHTARGETS_TANGENT
#ifdef USE_VERTEX_PULLING
tangentUpdated=vec4f(tangentUpdated.xyz+(readVector3FromRawSampler(i,vertexID) -vp_baseTangent.xyz)*uniforms.morphTargetInfluences[i],tangentUpdated.a);
#else
tangentUpdated=vec4f(tangentUpdated.xyz+(readVector3FromRawSampler(i,vertexID) -vertexInputs.tangent.xyz)*uniforms.morphTargetInfluences[i],tangentUpdated.a);
#endif
#endif
#ifdef MORPHTARGETTEXTURE_HASTANGENTS
vertexID=vertexID+1.0;
#endif
#ifdef MORPHTARGETS_UV2
#ifdef USE_VERTEX_PULLING
uv2Updated=uv2Updated+(readVector3FromRawSampler(i,vertexID).xy-vp_baseUV2)*uniforms.morphTargetInfluences[i];
#else
uv2Updated=uv2Updated+(readVector3FromRawSampler(i,vertexID).xy-vertexInputs.uv2)*uniforms.morphTargetInfluences[i];
#endif
#endif
#ifdef MORPHTARGETS_COLOR
#ifdef USE_VERTEX_PULLING
colorUpdated=colorUpdated+(readVector4FromRawSampler(i,vertexID)-vp_baseColor)*uniforms.morphTargetInfluences[i];
#else
colorUpdated=colorUpdated+(readVector4FromRawSampler(i,vertexID)-vertexInputs.color)*uniforms.morphTargetInfluences[i];
#endif
#endif
}
#endif
#else
#ifdef MORPHTARGETS_POSITION
#ifdef USE_VERTEX_PULLING
positionUpdated=positionUpdated+(vertexInputs.position{X}-vp_basePosition)*uniforms.morphTargetInfluences[{X}];
#else
positionUpdated=positionUpdated+(vertexInputs.position{X}-vertexInputs.position)*uniforms.morphTargetInfluences[{X}];
#endif
#endif
#ifdef MORPHTARGETS_NORMAL
#ifdef USE_VERTEX_PULLING
normalUpdated=normalUpdated+(vertexInputs.normal{X}-vp_baseNormal)*uniforms.morphTargetInfluences[{X}];
#else
normalUpdated=normalUpdated+(vertexInputs.normal{X}-vertexInputs.normal)*uniforms.morphTargetInfluences[{X}];
#endif
#endif
#ifdef MORPHTARGETS_TANGENT
#ifdef USE_VERTEX_PULLING
tangentUpdated=vec4f(tangentUpdated.xyz+(vertexInputs.tangent{X}-vp_baseTangent.xyz)*uniforms.morphTargetInfluences[{X}],tangentUpdated.a);
#else
tangentUpdated=vec4f(tangentUpdated.xyz+(vertexInputs.tangent{X}-vertexInputs.tangent.xyz)*uniforms.morphTargetInfluences[{X}],tangentUpdated.a);
#endif
#endif
#ifdef MORPHTARGETS_UV
#ifdef USE_VERTEX_PULLING
uvUpdated=uvUpdated+(vertexInputs.uv_{X}-vp_baseUV)*uniforms.morphTargetInfluences[{X}];
#else
uvUpdated=uvUpdated+(vertexInputs.uv_{X}-vertexInputs.uv)*uniforms.morphTargetInfluences[{X}];
#endif
#endif
#ifdef MORPHTARGETS_UV2
#ifdef USE_VERTEX_PULLING
uv2Updated=uv2Updated+(vertexInputs.uv2_{X}-vp_baseUV2)*uniforms.morphTargetInfluences[{X}];
#else
uv2Updated=uv2Updated+(vertexInputs.uv2_{X}-vertexInputs.uv2)*uniforms.morphTargetInfluences[{X}];
#endif
#endif
#ifdef MORPHTARGETS_COLOR
#ifdef USE_VERTEX_PULLING
colorUpdated=colorUpdated+(vertexInputs.color{X}-vp_baseColor)*uniforms.morphTargetInfluences[{X}];
#else
colorUpdated=colorUpdated+(vertexInputs.color{X}-vertexInputs.color)*uniforms.morphTargetInfluences[{X}];
#endif
#endif
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[f]||(t.f.IncludesShadersStoreWGSL[f]=n),e.s(["f",0,{name:f,shader:n}],47232);let a="instancesVertex",d=`#ifdef INSTANCES
var finalWorld=mat4x4<f32>(vertexInputs.world0,vertexInputs.world1,vertexInputs.world2,vertexInputs.world3);
#if defined(PREPASS_VELOCITY) || defined(VELOCITY) || defined(PREPASS_VELOCITY_LINEAR) || defined(VELOCITY_LINEAR)
var finalPreviousWorld=mat4x4<f32>(
vertexInputs.previousWorld0,vertexInputs.previousWorld1,
vertexInputs.previousWorld2,vertexInputs.previousWorld3);
#endif
#ifdef THIN_INSTANCES
#if !defined(WORLD_UBO)
finalWorld=uniforms.world*finalWorld;
#else
finalWorld=mesh.world*finalWorld;
#endif
#if defined(PREPASS_VELOCITY) || defined(VELOCITY) || defined(PREPASS_VELOCITY_LINEAR) || defined(VELOCITY_LINEAR)
finalPreviousWorld=uniforms.previousWorld*finalPreviousWorld;
#endif
#endif
#else
#if !defined(WORLD_UBO)
var finalWorld=uniforms.world;
#else
var finalWorld=mesh.world;
#endif
#if defined(PREPASS_VELOCITY) || defined(VELOCITY) || defined(PREPASS_VELOCITY_LINEAR) || defined(VELOCITY_LINEAR)
var finalPreviousWorld=uniforms.previousWorld;
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[a]||(t.f.IncludesShadersStoreWGSL[a]=d),e.s(["f",0,{name:a,shader:d}],93828);let o="bonesVertex",s=`#ifndef BAKED_VERTEX_ANIMATION_TEXTURE
#if NUM_BONE_INFLUENCERS>0
var influence : mat4x4<f32>;
#ifdef BONETEXTURE
influence=readMatrixFromRawSampler(boneSampler,vertexInputs.matricesIndices[0])*vertexInputs.matricesWeights[0];
#if NUM_BONE_INFLUENCERS>1
influence=influence+readMatrixFromRawSampler(boneSampler,vertexInputs.matricesIndices[1])*vertexInputs.matricesWeights[1];
#endif 
#if NUM_BONE_INFLUENCERS>2
influence=influence+readMatrixFromRawSampler(boneSampler,vertexInputs.matricesIndices[2])*vertexInputs.matricesWeights[2];
#endif 
#if NUM_BONE_INFLUENCERS>3
influence=influence+readMatrixFromRawSampler(boneSampler,vertexInputs.matricesIndices[3])*vertexInputs.matricesWeights[3];
#endif 
#if NUM_BONE_INFLUENCERS>4
influence=influence+readMatrixFromRawSampler(boneSampler,vertexInputs.matricesIndicesExtra[0])*vertexInputs.matricesWeightsExtra[0];
#endif 
#if NUM_BONE_INFLUENCERS>5
influence=influence+readMatrixFromRawSampler(boneSampler,vertexInputs.matricesIndicesExtra[1])*vertexInputs.matricesWeightsExtra[1];
#endif 
#if NUM_BONE_INFLUENCERS>6
influence=influence+readMatrixFromRawSampler(boneSampler,vertexInputs.matricesIndicesExtra[2])*vertexInputs.matricesWeightsExtra[2];
#endif 
#if NUM_BONE_INFLUENCERS>7
influence=influence+readMatrixFromRawSampler(boneSampler,vertexInputs.matricesIndicesExtra[3])*vertexInputs.matricesWeightsExtra[3];
#endif 
#else 
influence=uniforms.mBones[i32(vertexInputs.matricesIndices[0])]*vertexInputs.matricesWeights[0];
#if NUM_BONE_INFLUENCERS>1
influence=influence+uniforms.mBones[i32(vertexInputs.matricesIndices[1])]*vertexInputs.matricesWeights[1];
#endif 
#if NUM_BONE_INFLUENCERS>2
influence=influence+uniforms.mBones[i32(vertexInputs.matricesIndices[2])]*vertexInputs.matricesWeights[2];
#endif 
#if NUM_BONE_INFLUENCERS>3
influence=influence+uniforms.mBones[i32(vertexInputs.matricesIndices[3])]*vertexInputs.matricesWeights[3];
#endif 
#if NUM_BONE_INFLUENCERS>4
influence=influence+uniforms.mBones[i32(vertexInputs.matricesIndicesExtra[0])]*vertexInputs.matricesWeightsExtra[0];
#endif 
#if NUM_BONE_INFLUENCERS>5
influence=influence+uniforms.mBones[i32(vertexInputs.matricesIndicesExtra[1])]*vertexInputs.matricesWeightsExtra[1];
#endif 
#if NUM_BONE_INFLUENCERS>6
influence=influence+uniforms.mBones[i32(vertexInputs.matricesIndicesExtra[2])]*vertexInputs.matricesWeightsExtra[2];
#endif 
#if NUM_BONE_INFLUENCERS>7
influence=influence+uniforms.mBones[i32(vertexInputs.matricesIndicesExtra[3])]*vertexInputs.matricesWeightsExtra[3];
#endif 
#endif
finalWorld=finalWorld*influence;
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[o]||(t.f.IncludesShadersStoreWGSL[o]=s),e.s(["f",0,{name:o,shader:s}],31752);let u="bakedVertexAnimation",v=`#ifdef BAKED_VERTEX_ANIMATION_TEXTURE
{
#ifdef INSTANCES
let VATStartFrame: f32=vertexInputs.bakedVertexAnimationSettingsInstanced.x;let VATEndFrame: f32=vertexInputs.bakedVertexAnimationSettingsInstanced.y;let VATOffsetFrame: f32=vertexInputs.bakedVertexAnimationSettingsInstanced.z;let VATSpeed: f32=vertexInputs.bakedVertexAnimationSettingsInstanced.w;
#else
let VATStartFrame: f32=uniforms.bakedVertexAnimationSettings.x;let VATEndFrame: f32=uniforms.bakedVertexAnimationSettings.y;let VATOffsetFrame: f32=uniforms.bakedVertexAnimationSettings.z;let VATSpeed: f32=uniforms.bakedVertexAnimationSettings.w;
#endif
let totalFrames: f32=VATEndFrame-VATStartFrame+1.0;let time: f32=uniforms.bakedVertexAnimationTime*VATSpeed/totalFrames;let frameCorrection: f32=select(1.0,0.0,time<1.0);let numOfFrames: f32=totalFrames-frameCorrection;var VATFrameNum: f32=fract(time)*numOfFrames;VATFrameNum=(VATFrameNum+VATOffsetFrame) % numOfFrames;VATFrameNum=floor(VATFrameNum);VATFrameNum=VATFrameNum+VATStartFrame+frameCorrection;var VATInfluence : mat4x4<f32>;VATInfluence=readMatrixFromRawSamplerVAT(bakedVertexAnimationTexture,vertexInputs.matricesIndices[0],VATFrameNum)*vertexInputs.matricesWeights[0];
#if NUM_BONE_INFLUENCERS>1
VATInfluence=VATInfluence+readMatrixFromRawSamplerVAT(bakedVertexAnimationTexture,vertexInputs.matricesIndices[1],VATFrameNum)*vertexInputs.matricesWeights[1];
#endif
#if NUM_BONE_INFLUENCERS>2
VATInfluence=VATInfluence+readMatrixFromRawSamplerVAT(bakedVertexAnimationTexture,vertexInputs.matricesIndices[2],VATFrameNum)*vertexInputs.matricesWeights[2];
#endif
#if NUM_BONE_INFLUENCERS>3
VATInfluence=VATInfluence+readMatrixFromRawSamplerVAT(bakedVertexAnimationTexture,vertexInputs.matricesIndices[3],VATFrameNum)*vertexInputs.matricesWeights[3];
#endif
#if NUM_BONE_INFLUENCERS>4
VATInfluence=VATInfluence+readMatrixFromRawSamplerVAT(bakedVertexAnimationTexture,vertexInputs.matricesIndicesExtra[0],VATFrameNum)*vertexInputs.matricesWeightsExtra[0];
#endif
#if NUM_BONE_INFLUENCERS>5
VATInfluence=VATInfluence+readMatrixFromRawSamplerVAT(bakedVertexAnimationTexture,vertexInputs.matricesIndicesExtra[1],VATFrameNum)*vertexInputs.matricesWeightsExtra[1];
#endif
#if NUM_BONE_INFLUENCERS>6
VATInfluence=VATInfluence+readMatrixFromRawSamplerVAT(bakedVertexAnimationTexture,vertexInputs.matricesIndicesExtra[2],VATFrameNum)*vertexInputs.matricesWeightsExtra[2];
#endif
#if NUM_BONE_INFLUENCERS>7
VATInfluence=VATInfluence+readMatrixFromRawSamplerVAT(bakedVertexAnimationTexture,vertexInputs.matricesIndicesExtra[3],VATFrameNum)*vertexInputs.matricesWeightsExtra[3];
#endif
finalWorld=finalWorld*VATInfluence;}
#endif
`;t.f.IncludesShadersStoreWGSL[u]||(t.f.IncludesShadersStoreWGSL[u]=v),e.s(["f",0,{name:u,shader:v}],26106)},77676,33883,e=>{"use strict";var t=e.i(47662);let r="morphTargetsVertexGlobalDeclaration",i=`#ifdef MORPHTARGETS
uniform morphTargetInfluences : array<f32,NUM_MORPH_INFLUENCERS>;
#ifdef MORPHTARGETS_TEXTURE 
uniform morphTargetTextureIndices : array<f32,NUM_MORPH_INFLUENCERS>;uniform morphTargetTextureInfo : vec3<f32>;var morphTargets : texture_2d_array<f32>;fn readVector3FromRawSampler(targetIndex : i32,vertexIndex : f32)->vec3<f32>
{ 
let textureWidth: i32=i32(uniforms.morphTargetTextureInfo.y);let y: i32=i32(vertexIndex)/textureWidth;let x: i32=i32(vertexIndex) % textureWidth;return textureLoad(morphTargets,vec2i(x,y),i32(uniforms.morphTargetTextureIndices[targetIndex]),0).xyz;}
fn readVector4FromRawSampler(targetIndex : i32,vertexIndex : f32)->vec4<f32>
{ 
let textureWidth: i32=i32(uniforms.morphTargetTextureInfo.y); 
let y: i32=i32(vertexIndex)/textureWidth;let x: i32=i32(vertexIndex) % textureWidth;return textureLoad(morphTargets,vec2i(x,y),i32(uniforms.morphTargetTextureIndices[targetIndex]),0);}
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[r]||(t.f.IncludesShadersStoreWGSL[r]=i),e.s(["f",0,{name:r,shader:i}],77676);let f="morphTargetsVertexDeclaration",n=`#ifdef MORPHTARGETS
#ifndef MORPHTARGETS_TEXTURE
#ifdef MORPHTARGETS_POSITION
attribute position{X} : vec3<f32>;
#endif
#ifdef MORPHTARGETS_NORMAL
attribute normal{X} : vec3<f32>;
#endif
#ifdef MORPHTARGETS_TANGENT
attribute tangent{X} : vec3<f32>;
#endif
#ifdef MORPHTARGETS_UV
attribute uv_{X} : vec2<f32>;
#endif
#ifdef MORPHTARGETS_UV2
attribute uv2_{X} : vec2<f32>;
#endif
#ifdef MORPHTARGETS_COLOR
attribute color{X} : vec4<f32>;
#endif
#elif {X}==0
uniform morphTargetCount: f32;
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[f]||(t.f.IncludesShadersStoreWGSL[f]=n),e.s(["f",0,{name:f,shader:n}],33883)},60896,e=>{"use strict";var t=e.i(47662);let r="sceneUboDeclaration",i=`struct Scene {viewProjection : mat4x4<f32>,
#ifdef MULTIVIEW
viewProjectionR : mat4x4<f32>,
#endif 
view : mat4x4<f32>,
projection : mat4x4<f32>,
vEyePosition : vec4<f32>,
inverseProjection : mat4x4<f32>,};
#define SCENE_UBO
var<uniform> scene : Scene;
`;t.f.IncludesShadersStoreWGSL[r]||(t.f.IncludesShadersStoreWGSL[r]=i),e.s(["f",0,{name:r,shader:i}])},53707,88877,1981,30034,23399,66739,66078,36226,32576,7503,64104,e=>{"use strict";var t=e.i(47662);let r="uvAttributeDeclaration",i=`#if defined(UV{X}) && !defined(USE_VERTEX_PULLING)
attribute uv{X}: vec2f;
#endif
`;t.f.IncludesShadersStoreWGSL[r]||(t.f.IncludesShadersStoreWGSL[r]=i),e.s(["f",0,{name:r,shader:i}],53707);let f="prePassVertexDeclaration",n=`#ifdef PREPASS
#ifdef PREPASS_LOCAL_POSITION
varying vPosition : vec3f;
#endif
#ifdef PREPASS_DEPTH
varying vViewPos: vec3f;
#endif
#ifdef PREPASS_NORMALIZED_VIEW_DEPTH
varying vNormViewDepth: f32;
#endif
#if defined(PREPASS_VELOCITY) || defined(PREPASS_VELOCITY_LINEAR)
uniform previousViewProjection: mat4x4f;varying vCurrentPosition: vec4f;varying vPreviousPosition: vec4f;
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[f]||(t.f.IncludesShadersStoreWGSL[f]=n),e.s(["f",0,{name:f,shader:n}],88877);let a="samplerVertexDeclaration",d=`#if defined(_DEFINENAME_) && _DEFINENAME_DIRECTUV==0
varying v_VARYINGNAME_UV: vec2f;
#endif
`;t.f.IncludesShadersStoreWGSL[a]||(t.f.IncludesShadersStoreWGSL[a]=d),e.s(["f",0,{name:a,shader:d}],1981);let o="lightVxUboDeclaration",s=`#ifdef LIGHT{X}
struct Light{X}
{vLightData: vec4f,
vLightDiffuse: vec4f,
vLightSpecular: vec4f,
#ifdef SPOTLIGHT{X}
vLightDirection: vec4f,
vLightFalloff: vec4f,
#elif defined(POINTLIGHT{X})
vLightFalloff: vec4f,
#elif defined(HEMILIGHT{X})
vLightGround: vec3f,
#elif defined(CLUSTLIGHT{X})
vSliceData: vec2f,
vSliceRanges: array<vec4f,CLUSTLIGHT_SLICES>,
#endif
#if defined(AREALIGHT{X}) && defined(AREALIGHTUSED) && defined(AREALIGHTSUPPORTED)
vLightWidth: vec4f,
vLightHeight: vec4f,
#endif
shadowsInfo: vec4f,
depthValues: vec2f} ;var<uniform> light{X} : Light{X};
#ifdef SHADOW{X}
#ifdef SHADOWCSM{X}
uniform lightMatrix{X}: array<mat4x4f,SHADOWCSMNUM_CASCADES{X}>;varying vPositionFromLight{X}_0: vec4f;varying vDepthMetric{X}_0: f32;varying vPositionFromLight{X}_1: vec4f;varying vDepthMetric{X}_1: f32;varying vPositionFromLight{X}_2: vec4f;varying vDepthMetric{X}_2: f32;varying vPositionFromLight{X}_3: vec4f;varying vDepthMetric{X}_3: f32;varying vPositionFromCamera{X}: vec4f;
#elif defined(SHADOWCUBE{X})
#else
varying vPositionFromLight{X}: vec4f;varying vDepthMetric{X}: f32;uniform lightMatrix{X}: mat4x4f;
#endif
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[o]||(t.f.IncludesShadersStoreWGSL[o]=s),e.s(["f",0,{name:o,shader:s}],30034);let u="vertexPullingDeclaration",v=`#ifdef USE_VERTEX_PULLING
#ifdef VERTEX_PULLING_USE_INDEX_BUFFER
var<storage,read> indices : array<u32>;
#endif
var<storage,read> position : array<f32>;uniform vp_position_info : vec4f;
#ifdef NORMAL
var<storage,read> normal : array<f32>;uniform vp_normal_info : vec4f;
#endif
#ifdef TANGENT
var<storage,read> tangent : array<f32>;uniform vp_tangent_info : vec4f;
#endif
#ifdef UV1
var<storage,read> uv : array<f32>;uniform vp_uv_info : vec4f;
#define VP_UV1_SUPPORTED
#endif
#ifdef UV2
var<storage,read> uv2 : array<f32>;uniform vp_uv2_info : vec4f;
#define VP_UV2_SUPPORTED
#endif
#ifdef UV3
var<storage,read> uv3 : array<f32>;uniform vp_uv3_info : vec4f;
#define VP_UV3_SUPPORTED
#endif
#ifdef UV4
var<storage,read> uv4 : array<f32>;uniform vp_uv4_info : vec4f;
#define VP_UV4_SUPPORTED
#endif
#ifdef UV5
var<storage,read> uv5 : array<f32>;uniform vp_uv5_info : vec4f;
#define VP_UV5_SUPPORTED
#endif
#ifdef UV6
var<storage,read> uv6 : array<f32>;uniform vp_uv6_info : vec4f;
#define VP_UV6_SUPPORTED
#endif
#ifdef VERTEXCOLOR
var<storage,read> color : array<f32>;uniform vp_color_info : vec4f;
#endif
#if NUM_BONE_INFLUENCERS>0
var<storage,read> matricesIndices : array<u32>;var<storage,read> matricesWeights : array<f32>;uniform vp_matricesIndices_info : vec4f;uniform vp_matricesWeights_info : vec4f;
#if NUM_BONE_INFLUENCERS>4
var<storage,read> matricesIndicesExtra : array<u32>;var<storage,read> matricesWeightsExtra : array<f32>;uniform vp_matricesIndicesExtra_info : vec4f;uniform vp_matricesWeightsExtra_info : vec4f;
#endif
#endif
fn vp_convertToFloat(word : u32,byteInWord : u32,dataType : u32,normalized : bool)->f32 {switch (dataType) {case 5120u: { 
let shift=byteInWord*8u;let value=(word>>shift) & 0xFFu;let signedValue=f32(i32(value<<24u)>>24u);if (normalized) { return signedValue/127.0; }
return signedValue;}
case 5121u: { 
let shift=byteInWord*8u;let value=(word>>shift) & 0xFFu;if (normalized) { return f32(value)/255.0; }
return f32(value);}
case 5122u: { 
let shift=(byteInWord & 0xFFFFFFFEu)*8u;let value=(word>>shift) & 0xFFFFu;let signedValue=f32(i32(value<<16u)>>16u);if (normalized) { return signedValue/32767.0; }
return signedValue;}
case 5123u: { 
let shift=(byteInWord & 0xFFFFFFFEu)*8u;let value=(word>>shift) & 0xFFFFu;if (normalized) { return f32(value)/65535.0; }
return f32(value);}
case 5126u: { 
return bitcast<f32>(word);}
default: { return 0.0; }}}
fn vp_componentSize(dataType : u32)->u32 {return select(select(2u,1u,dataType==5120u || dataType==5121u),4u,dataType==5126u);}
fn vp_readVertexIndex(index : u32)->u32 {
#ifndef VERTEX_PULLING_USE_INDEX_BUFFER
return index;
#else
#ifdef VERTEX_PULLING_INDEX_BUFFER_32BITS
return indices[index];
#else
let u32_index=index/2u;let bit_offset=(index & 1u)*16u;return (indices[u32_index]>>bit_offset) & 0xFFFFu;
#endif
#endif
}
fn vp_readPositionValue(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(position[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readPosition(info : vec4f,vertexIndex : u32)->vec3f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec3f(
vp_readPositionValue(offset,dataType,normalized),
vp_readPositionValue(offset+cs,dataType,normalized),
vp_readPositionValue(offset+cs*2u,dataType,normalized)
);}
#ifdef NORMAL
fn vp_readNormalValue(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(normal[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readNormal(info : vec4f,vertexIndex : u32)->vec3f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec3f(
vp_readNormalValue(offset,dataType,normalized),
vp_readNormalValue(offset+cs,dataType,normalized),
vp_readNormalValue(offset+cs*2u,dataType,normalized)
);}
#endif
#ifdef TANGENT
fn vp_readTangentValue(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(tangent[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readTangent(info : vec4f,vertexIndex : u32)->vec4f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec4f(
vp_readTangentValue(offset,dataType,normalized),
vp_readTangentValue(offset+cs,dataType,normalized),
vp_readTangentValue(offset+cs*2u,dataType,normalized),
vp_readTangentValue(offset+cs*3u,dataType,normalized)
);}
#endif
#ifdef UV1
fn vp_readUVValue(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(uv[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readUV(info : vec4f,vertexIndex : u32)->vec2f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec2f(
vp_readUVValue(offset,dataType,normalized),
vp_readUVValue(offset+cs,dataType,normalized)
);}
#endif
#ifdef UV2
fn vp_readUV2Value(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(uv2[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readUV2(info : vec4f,vertexIndex : u32)->vec2f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec2f(
vp_readUV2Value(offset,dataType,normalized),
vp_readUV2Value(offset+cs,dataType,normalized)
);}
#endif
#ifdef UV3
fn vp_readUV3Value(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(uv3[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readUV3(info : vec4f,vertexIndex : u32)->vec2f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec2f(
vp_readUV3Value(offset,dataType,normalized),
vp_readUV3Value(offset+cs,dataType,normalized)
);}
#endif
#ifdef UV4
fn vp_readUV4Value(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(uv4[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readUV4(info : vec4f,vertexIndex : u32)->vec2f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec2f(
vp_readUV4Value(offset,dataType,normalized),
vp_readUV4Value(offset+cs,dataType,normalized)
);}
#endif
#ifdef UV5
fn vp_readUV5Value(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(uv5[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readUV5(info : vec4f,vertexIndex : u32)->vec2f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec2f(
vp_readUV5Value(offset,dataType,normalized),
vp_readUV5Value(offset+cs,dataType,normalized)
);}
#endif
#ifdef UV6
fn vp_readUV6Value(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(uv6[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readUV6(info : vec4f,vertexIndex : u32)->vec2f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec2f(
vp_readUV6Value(offset,dataType,normalized),
vp_readUV6Value(offset+cs,dataType,normalized)
);}
#endif
#ifdef VERTEXCOLOR
fn vp_readColorValue(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(color[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readColor(info : vec4f,vertexIndex : u32)->vec4f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec4f(
vp_readColorValue(offset,dataType,normalized),
vp_readColorValue(offset+cs,dataType,normalized),
vp_readColorValue(offset+cs*2u,dataType,normalized),
vp_readColorValue(offset+cs*3u,dataType,normalized)
);}
#endif
#if NUM_BONE_INFLUENCERS>0
fn vp_readMatrixIndexValue(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(matricesIndices[byteOffset/4u],byteOffset % 4u,dataType,normalized);}
fn vp_readBoneIndices(info : vec4f,vertexIndex : u32)->vec4f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec4f(
vp_readMatrixIndexValue(offset,dataType,normalized),
vp_readMatrixIndexValue(offset+cs,dataType,normalized),
vp_readMatrixIndexValue(offset+cs*2u,dataType,normalized),
vp_readMatrixIndexValue(offset+cs*3u,dataType,normalized)
);}
fn vp_readMatrixWeightValue(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(matricesWeights[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readBoneWeights(info : vec4f,vertexIndex : u32)->vec4f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec4f(
vp_readMatrixWeightValue(offset,dataType,normalized),
vp_readMatrixWeightValue(offset+cs,dataType,normalized),
vp_readMatrixWeightValue(offset+cs*2u,dataType,normalized),
vp_readMatrixWeightValue(offset+cs*3u,dataType,normalized)
);}
#if NUM_BONE_INFLUENCERS>4
fn vp_readMatrixIndexExtraValue(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(matricesIndicesExtra[byteOffset/4u],byteOffset % 4u,dataType,normalized);}
fn vp_readBoneIndicesExtra(info : vec4f,vertexIndex : u32)->vec4f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec4f(
vp_readMatrixIndexExtraValue(offset,dataType,normalized),
vp_readMatrixIndexExtraValue(offset+cs,dataType,normalized),
vp_readMatrixIndexExtraValue(offset+cs*2u,dataType,normalized),
vp_readMatrixIndexExtraValue(offset+cs*3u,dataType,normalized)
);}
fn vp_readMatrixWeightExtraValue(byteOffset : u32,dataType : u32,normalized : bool)->f32 {return vp_convertToFloat(bitcast<u32>(matricesWeightsExtra[byteOffset/4u]),byteOffset % 4u,dataType,normalized);}
fn vp_readBoneWeightsExtra(info : vec4f,vertexIndex : u32)->vec4f {let baseOffset=u32(info.x);let stride=u32(info.y);let dataType=u32(info.z);let normalized=info.w != 0.0;let offset=baseOffset+vertexIndex*stride;let cs=vp_componentSize(dataType);return vec4f(
vp_readMatrixWeightExtraValue(offset,dataType,normalized),
vp_readMatrixWeightExtraValue(offset+cs,dataType,normalized),
vp_readMatrixWeightExtraValue(offset+cs*2u,dataType,normalized),
vp_readMatrixWeightExtraValue(offset+cs*3u,dataType,normalized)
);}
#endif
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[u]||(t.f.IncludesShadersStoreWGSL[u]=v),e.s(["f",0,{name:u,shader:v}],23399);let l="vertexPullingVertex",c=`#ifdef USE_VERTEX_PULLING
let vpVertexIndex: u32=vp_readVertexIndex(vertexInputs.vertexIndex);positionUpdated=vp_readPosition(uniforms.vp_position_info,vpVertexIndex);
#ifdef NORMAL
normalUpdated=vp_readNormal(uniforms.vp_normal_info,vpVertexIndex);
#endif
#ifdef TANGENT
tangentUpdated=vp_readTangent(uniforms.vp_tangent_info,vpVertexIndex);
#endif
#ifdef UV1
uvUpdated=vp_readUV(uniforms.vp_uv_info,vpVertexIndex);
#endif
#ifdef UV2
uv2Updated=vp_readUV2(uniforms.vp_uv2_info,vpVertexIndex);
#endif
#ifdef UV3
var uv3Updated: vec2f=vp_readUV3(uniforms.vp_uv3_info,vpVertexIndex);
#endif
#ifdef UV4
var uv4Updated: vec2f=vp_readUV4(uniforms.vp_uv4_info,vpVertexIndex);
#endif
#ifdef UV5
var uv5Updated: vec2f=vp_readUV5(uniforms.vp_uv5_info,vpVertexIndex);
#endif
#ifdef UV6
var uv6Updated: vec2f=vp_readUV6(uniforms.vp_uv6_info,vpVertexIndex);
#endif
#ifdef VERTEXCOLOR
colorUpdated=vp_readColor(uniforms.vp_color_info,vpVertexIndex);
#endif
#ifdef MORPHTARGETS
let vp_basePosition: vec3f=positionUpdated;
#ifdef NORMAL
let vp_baseNormal: vec3f=normalUpdated;
#endif
#ifdef TANGENT
let vp_baseTangent: vec4f=tangentUpdated;
#endif
#ifdef UV1
let vp_baseUV: vec2f=uvUpdated;
#endif
#ifdef UV2
let vp_baseUV2: vec2f=uv2Updated;
#endif
#ifdef VERTEXCOLOR
let vp_baseColor: vec4f=colorUpdated;
#endif
#endif
#if NUM_BONE_INFLUENCERS>0
var vp_matricesIndices: vec4f=vp_readBoneIndices(uniforms.vp_matricesIndices_info,vpVertexIndex);var vp_matricesWeights: vec4f=vp_readBoneWeights(uniforms.vp_matricesWeights_info,vpVertexIndex);
#if NUM_BONE_INFLUENCERS>4
var vp_matricesIndicesExtra: vec4f=vp_readBoneIndicesExtra(uniforms.vp_matricesIndicesExtra_info,vpVertexIndex);var vp_matricesWeightsExtra: vec4f=vp_readBoneWeightsExtra(uniforms.vp_matricesWeightsExtra_info,vpVertexIndex);
#endif
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[l]||(t.f.IncludesShadersStoreWGSL[l]=c),e.s(["f",0,{name:l,shader:c}],66739);let p="prePassVertex",m=`#ifdef PREPASS_DEPTH
vertexOutputs.vViewPos=(scene.view*worldPos).rgb;
#endif
#ifdef PREPASS_NORMALIZED_VIEW_DEPTH
vertexOutputs.vNormViewDepth=((scene.view*worldPos).z-uniforms.cameraInfo.x)/(uniforms.cameraInfo.y-uniforms.cameraInfo.x);
#endif
#ifdef PREPASS_LOCAL_POSITION
vertexOutputs.vPosition=positionUpdated.xyz;
#endif
#if (defined(PREPASS_VELOCITY) || defined(PREPASS_VELOCITY_LINEAR)) && defined(BONES_VELOCITY_ENABLED)
vertexOutputs.vCurrentPosition=scene.viewProjection*worldPos;
#if NUM_BONE_INFLUENCERS>0
var previousInfluence: mat4x4f;previousInfluence=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndices[0])]*vertexInputs.matricesWeights[0];
#if NUM_BONE_INFLUENCERS>1
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndices[1])]*vertexInputs.matricesWeights[1];
#endif 
#if NUM_BONE_INFLUENCERS>2
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndices[2])]*vertexInputs.matricesWeights[2];
#endif 
#if NUM_BONE_INFLUENCERS>3
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndices[3])]*vertexInputs.matricesWeights[3];
#endif
#if NUM_BONE_INFLUENCERS>4
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndicesExtra[0])]*vertexInputs.matricesWeightsExtra[0];
#endif 
#if NUM_BONE_INFLUENCERS>5
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndicesExtra[1])]*vertexInputs.matricesWeightsExtra[1];
#endif 
#if NUM_BONE_INFLUENCERS>6
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndicesExtra[2])]*vertexInputs.matricesWeightsExtra[2];
#endif 
#if NUM_BONE_INFLUENCERS>7
previousInfluence+=uniforms.mPreviousBones[ i32(vertexInputs.matricesIndicesExtra[3])]*vertexInputs.matricesWeightsExtra[3];
#endif
vertexOutputs.vPreviousPosition=uniforms.previousViewProjection*finalPreviousWorld*previousInfluence* vec4f(positionUpdated,1.0);
#else
vertexOutputs.vPreviousPosition=uniforms.previousViewProjection*finalPreviousWorld* vec4f(positionUpdated,1.0);
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[p]||(t.f.IncludesShadersStoreWGSL[p]=m),e.s(["f",0,{name:p,shader:m}],66078);let x="uvVariableDeclaration",I=`#ifdef MAINUV{X}
#if !defined(UV{X})
var uv{X}: vec2f=vec2f(0.,0.);
#elif defined(USE_VERTEX_PULLING)
var uv{X}: vec2f=uv{X}Updated;
#else
var uv{X}: vec2f=vertexInputs.uv{X};
#endif
vertexOutputs.vMainUV{X}=uv{X};
#endif
`;t.f.IncludesShadersStoreWGSL[x]||(t.f.IncludesShadersStoreWGSL[x]=I),e.s(["f",0,{name:x,shader:I}],36226);let E="samplerVertexImplementation",_=`#if defined(_DEFINENAME_) && _DEFINENAME_DIRECTUV==0
if (uniforms.v_INFONAME_==0.)
{vertexOutputs.v_VARYINGNAME_UV= (uniforms._MATRIXNAME_Matrix* vec4f(uvUpdated,1.0,0.0)).xy;}
#ifdef UV2
else if (uniforms.v_INFONAME_==1.)
{vertexOutputs.v_VARYINGNAME_UV= (uniforms._MATRIXNAME_Matrix* vec4f(uv2Updated,1.0,0.0)).xy;}
#endif
#ifdef UV3
else if (uniforms.v_INFONAME_==2.)
{vertexOutputs.v_VARYINGNAME_UV= (uniforms._MATRIXNAME_Matrix* vec4f(vertexInputs.uv3,1.0,0.0)).xy;}
#endif
#ifdef UV4
else if (uniforms.v_INFONAME_==3.)
{vertexOutputs.v_VARYINGNAME_UV= (uniforms._MATRIXNAME_Matrix* vec4f(vertexInputs.uv4,1.0,0.0)).xy;}
#endif
#ifdef UV5
else if (uniforms.v_INFONAME_==4.)
{vertexOutputs.v_VARYINGNAME_UV= (uniforms._MATRIXNAME_Matrix* vec4f(vertexInputs.uv5,1.0,0.0)).xy;}
#endif
#ifdef UV6
else if (uniforms.v_INFONAME_==5.)
{vertexOutputs.v_VARYINGNAME_UV= (uniforms._MATRIXNAME_Matrix* vec4f(vertexInputs.uv6,1.0,0.0)).xy;}
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[E]||(t.f.IncludesShadersStoreWGSL[E]=_),e.s(["f",0,{name:E,shader:_}],32576);let S="shadowsVertex",T=`#ifdef SHADOWS
#if defined(SHADOWCSM{X})
#ifdef SCENE_UBO
vertexOutputs.vPositionFromCamera{X}=scene.view*worldPos;
#else
vertexOutputs.vPositionFromCamera{X}=uniforms.view*worldPos;
#endif
#if SHADOWCSMNUM_CASCADES{X}>0
vertexOutputs.vPositionFromLight{X}_0=uniforms.lightMatrix{X}[0]*worldPos;
#ifdef USE_REVERSE_DEPTHBUFFER
vertexOutputs.vDepthMetric{X}_0=(-vertexOutputs.vPositionFromLight{X}_0.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#else
vertexOutputs.vDepthMetric{X}_0= (vertexOutputs.vPositionFromLight{X}_0.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#endif
#endif
#if SHADOWCSMNUM_CASCADES{X}>1
vertexOutputs.vPositionFromLight{X}_1=uniforms.lightMatrix{X}[1]*worldPos;
#ifdef USE_REVERSE_DEPTHBUFFER
vertexOutputs.vDepthMetric{X}_1=(-vertexOutputs.vPositionFromLight{X}_1.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#else
vertexOutputs.vDepthMetric{X}_1= (vertexOutputs.vPositionFromLight{X}_1.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#endif
#endif 
#if SHADOWCSMNUM_CASCADES{X}>2
vertexOutputs.vPositionFromLight{X}_2=uniforms.lightMatrix{X}[2]*worldPos;
#ifdef USE_REVERSE_DEPTHBUFFER
vertexOutputs.vDepthMetric{X}_2=(-vertexOutputs.vPositionFromLight{X}_2.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#else
vertexOutputs.vDepthMetric{X}_2= (vertexOutputs.vPositionFromLight{X}_2.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#endif
#endif 
#if SHADOWCSMNUM_CASCADES{X}>3
vertexOutputs.vPositionFromLight{X}_3=uniforms.lightMatrix{X}[3]*worldPos;
#ifdef USE_REVERSE_DEPTHBUFFER
vertexOutputs.vDepthMetric{X}_3=(-vertexOutputs.vPositionFromLight{X}_3.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#else
vertexOutputs.vDepthMetric{X}_3= (vertexOutputs.vPositionFromLight{X}_3.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#endif
#endif 
#elif defined(SHADOW{X}) && !defined(SHADOWCUBE{X})
vertexOutputs.vPositionFromLight{X}=uniforms.lightMatrix{X}*worldPos;
#ifdef USE_REVERSE_DEPTHBUFFER
vertexOutputs.vDepthMetric{X}=(-vertexOutputs.vPositionFromLight{X}.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#else
vertexOutputs.vDepthMetric{X}=(vertexOutputs.vPositionFromLight{X}.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#endif
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[S]||(t.f.IncludesShadersStoreWGSL[S]=T),e.s(["f",0,{name:S,shader:T}],7503);let V="vertexColorMixing",N=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
vertexOutputs.vColor=vec4f(1.0);
#ifdef VERTEXCOLOR
#ifdef VERTEXALPHA
vertexOutputs.vColor*=colorUpdated;
#else
vertexOutputs.vColor=vec4f(vertexOutputs.vColor.rgb*colorUpdated.rgb,vertexOutputs.vColor.a);
#endif
#endif
#ifdef INSTANCESCOLOR
vertexOutputs.vColor*=vertexInputs.instanceColor;
#endif
#endif
`;t.f.IncludesShadersStoreWGSL[V]||(t.f.IncludesShadersStoreWGSL[V]=N),e.s(["f",0,{name:V,shader:N}],64104)}]);