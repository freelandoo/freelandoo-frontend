(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,79939,e=>{"use strict";var i=e.i(47662);let o="clipPlaneFragment",f=`#if defined(CLIPPLANE) || defined(CLIPPLANE2) || defined(CLIPPLANE3) || defined(CLIPPLANE4) || defined(CLIPPLANE5) || defined(CLIPPLANE6)
if (false) {}
#endif
#ifdef CLIPPLANE
else if (fClipDistance>0.0)
{discard;}
#endif
#ifdef CLIPPLANE2
else if (fClipDistance2>0.0)
{discard;}
#endif
#ifdef CLIPPLANE3
else if (fClipDistance3>0.0)
{discard;}
#endif
#ifdef CLIPPLANE4
else if (fClipDistance4>0.0)
{discard;}
#endif
#ifdef CLIPPLANE5
else if (fClipDistance5>0.0)
{discard;}
#endif
#ifdef CLIPPLANE6
else if (fClipDistance6>0.0)
{discard;}
#endif
`;i.f.IncludesShadersStore[o]||(i.f.IncludesShadersStore[o]=f),e.s(["f",0,{name:o,shader:f}])},81239,e=>{"use strict";var i=e.i(47662);let o="clipPlaneFragmentDeclaration",f=`#ifdef CLIPPLANE
varying float fClipDistance;
#endif
#ifdef CLIPPLANE2
varying float fClipDistance2;
#endif
#ifdef CLIPPLANE3
varying float fClipDistance3;
#endif
#ifdef CLIPPLANE4
varying float fClipDistance4;
#endif
#ifdef CLIPPLANE5
varying float fClipDistance5;
#endif
#ifdef CLIPPLANE6
varying float fClipDistance6;
#endif
`;i.f.IncludesShadersStore[o]||(i.f.IncludesShadersStore[o]=f),e.s(["f",0,{name:o,shader:f}])},71154,e=>{"use strict";var i=e.i(47662);let o="fogFragmentDeclaration",f=`#ifdef FOG
#define FOGMODE_NONE 0.
#define FOGMODE_EXP 1.
#define FOGMODE_EXP2 2.
#define FOGMODE_LINEAR 3.
#define E 2.71828
uniform vec4 vFogInfos;uniform vec3 vFogColor;varying vec3 vFogDistance;float CalcFogFactor()
{float fogCoeff=1.0;float fogStart=vFogInfos.y;float fogEnd=vFogInfos.z;float fogDensity=vFogInfos.w;float fogDistance=length(vFogDistance);if (FOGMODE_LINEAR==vFogInfos.x)
{fogCoeff=(fogEnd-fogDistance)/(fogEnd-fogStart);}
else if (FOGMODE_EXP==vFogInfos.x)
{fogCoeff=1.0/pow(E,fogDistance*fogDensity);}
else if (FOGMODE_EXP2==vFogInfos.x)
{fogCoeff=1.0/pow(E,fogDistance*fogDistance*fogDensity*fogDensity);}
return clamp(fogCoeff,0.0,1.0);}
#endif
`;i.f.IncludesShadersStore[o]||(i.f.IncludesShadersStore[o]=f),e.s(["f",0,{name:o,shader:f}])},55701,e=>{"use strict";var i=e.i(47662);let o="geometryRenderingFragment",f=`#ifdef PREPASS
#if SCENE_MRT_COUNT>0
float geometryCoverage=geometryColor.a>0.4 ? 1.0 : 0.0;
#ifdef PREPASS_COLOR
WRITE_GEOMETRY_FRAGMENT_OUTPUT(PREPASS_COLOR_INDEX,geometryColor);
#endif
#ifdef PREPASS_POSITION
WRITE_GEOMETRY_FRAGMENT_OUTPUT(PREPASS_POSITION_INDEX,vec4(geometryPositionW,geometryCoverage));
#endif
#ifdef PREPASS_LOCAL_POSITION
WRITE_GEOMETRY_FRAGMENT_OUTPUT(PREPASS_LOCAL_POSITION_INDEX,vec4(geometryPositionL,geometryCoverage));
#endif
#ifdef PREPASS_DEPTH
WRITE_GEOMETRY_FRAGMENT_OUTPUT(PREPASS_DEPTH_INDEX,vec4(geometryViewDepth,0.0,0.0,geometryCoverage));
#endif
#ifdef PREPASS_NORMALIZED_VIEW_DEPTH
WRITE_GEOMETRY_FRAGMENT_OUTPUT(PREPASS_NORMALIZED_VIEW_DEPTH_INDEX,vec4(geometryNormalizedViewDepth,0.0,0.0,geometryCoverage));
#endif
#ifdef PREPASS_SCREENSPACE_DEPTH
WRITE_GEOMETRY_FRAGMENT_OUTPUT(PREPASS_SCREENSPACE_DEPTH_INDEX,vec4(gl_FragCoord.z,0.0,0.0,geometryCoverage));
#endif
#ifdef PREPASS_NORMAL
WRITE_GEOMETRY_FRAGMENT_OUTPUT(PREPASS_NORMAL_INDEX,vec4(geometryNormalV,geometryCoverage));
#endif
#ifdef PREPASS_WORLD_NORMAL
WRITE_GEOMETRY_FRAGMENT_OUTPUT(PREPASS_WORLD_NORMAL_INDEX,vec4(geometryNormalW*0.5+0.5,geometryCoverage));
#endif
#ifdef PREPASS_ALBEDO
WRITE_GEOMETRY_FRAGMENT_OUTPUT(PREPASS_ALBEDO_INDEX,vec4(geometryAlbedo,geometryCoverage));
#endif
#ifdef PREPASS_ALBEDO_SQRT
WRITE_GEOMETRY_FRAGMENT_OUTPUT(PREPASS_ALBEDO_SQRT_INDEX,vec4(sqrt(max(geometryAlbedo,vec3(0.0))),geometryCoverage));
#endif
#ifdef PREPASS_REFLECTIVITY
WRITE_GEOMETRY_FRAGMENT_OUTPUT(PREPASS_REFLECTIVITY_INDEX,vec4(0.0,0.0,0.0,geometryCoverage));
#endif
#ifdef PREPASS_IRRADIANCE
WRITE_GEOMETRY_FRAGMENT_OUTPUT(PREPASS_IRRADIANCE_INDEX,vec4(0.0,0.0,0.0,geometryCoverage));
#endif
#ifdef PREPASS_IRRADIANCE_LEGACY
WRITE_GEOMETRY_FRAGMENT_OUTPUT(PREPASS_IRRADIANCE_LEGACY_INDEX,vec4(0.0));
#endif
#if defined(PREPASS_VELOCITY) || defined(PREPASS_VELOCITY_LINEAR)
#ifdef PREPASS_VELOCITY_ZERO
vec2 geometryMotion=vec2(0.0);
#else
vec2 geometryMotion=0.5*(geometryCurrentPosition.xy/geometryCurrentPosition.w-geometryPreviousPosition.xy/geometryPreviousPosition.w);
#endif
#ifdef PREPASS_VELOCITY
WRITE_GEOMETRY_FRAGMENT_OUTPUT(PREPASS_VELOCITY_INDEX,vec4(pow(abs(geometryMotion),vec2(1.0/3.0))*sign(geometryMotion)*0.5+0.5,0.0,geometryCoverage));
#endif
#ifdef PREPASS_VELOCITY_LINEAR
WRITE_GEOMETRY_FRAGMENT_OUTPUT(PREPASS_VELOCITY_LINEAR_INDEX,vec4(-geometryMotion,0.0,geometryCoverage));
#endif
#endif
#ifdef PREPASS_OBJECT_ID
WRITE_GEOMETRY_FRAGMENT_OUTPUT(PREPASS_OBJECT_ID_INDEX,encodeObjectId(objectId)*geometryCoverage);
#endif
#ifdef PREPASS_MESH_BLEND_TAG
meshBlendTagOutput=geometryCoverage>0.0 ? uvec4(uint(meshBlendTag),0u,0u,0u) : uvec4(0u);
#endif
#endif
#endif
`;i.f.IncludesShadersStore[o]||(i.f.IncludesShadersStore[o]=f),e.s(["f",0,{name:o,shader:f}])},45224,e=>{"use strict";var i=e.i(47662);let o="logDepthDeclaration",f=`#ifdef LOGARITHMICDEPTH
uniform float logarithmicDepthConstant;varying float vFragmentDepth;
#endif
`;i.f.IncludesShadersStore[o]||(i.f.IncludesShadersStore[o]=f),e.s(["f",0,{name:o,shader:f}])},49426,72079,e=>{"use strict";var i=e.i(47662);let o="logDepthFragment",f=`#ifdef LOGARITHMICDEPTH
gl_FragDepthEXT=log2(vFragmentDepth)*logarithmicDepthConstant*0.5;
#endif
`;i.f.IncludesShadersStore[o]||(i.f.IncludesShadersStore[o]=f),e.s(["f",0,{name:o,shader:f}],49426);let t="fogFragment",n=`#ifdef FOG
float fog=CalcFogFactor();
#ifdef PBR
fog=toLinearSpace(fog);
#endif
color.rgb=mix(vFogColor,color.rgb,fog);
#endif
`;i.f.IncludesShadersStore[t]||(i.f.IncludesShadersStore[t]=n),e.s(["f",0,{name:t,shader:n}],72079)},71194,e=>{"use strict";var i=e.i(47662);let o="objectIdFunctions",f=`highp vec4 encodeObjectId(highp float objectId) {
#ifdef PREPASS_OBJECT_ID_R8
return vec4(objectId/255.0,0.0,0.0,1.0);
#else
highp float id=floor(objectId);highp vec3 encodedId=vec3(
floor(mod(id,16777216.0)/65536.0),
floor(mod(id,65536.0)/256.0),
mod(id,256.0)
)/255.0;return vec4(encodedId,step(0.5,id));
#endif
}
`;i.f.IncludesShadersStore[o]||(i.f.IncludesShadersStore[o]=f),e.s(["f",0,{name:o,shader:f}])},78144,e=>{"use strict";var i=e.i(47662);e.i(71194);let o="prePassDeclaration",f=`#ifdef PREPASS
#extension GL_EXT_draw_buffers : require
#ifdef PREPASS_MESH_BLEND_TAG
#if {X}>0
#if PREPASS_MESH_BLEND_TAG_INDEX==0
layout(location=0) out highp uvec4 meshBlendTagOutput;
#else
layout(location=0) out highp vec4 glFragData0;
#endif
#endif
#if {X}>1
#if PREPASS_MESH_BLEND_TAG_INDEX==1
layout(location=1) out highp uvec4 meshBlendTagOutput;
#else
layout(location=1) out highp vec4 glFragData1;
#endif
#endif
#if {X}>2
#if PREPASS_MESH_BLEND_TAG_INDEX==2
layout(location=2) out highp uvec4 meshBlendTagOutput;
#else
layout(location=2) out highp vec4 glFragData2;
#endif
#endif
#if {X}>3
#if PREPASS_MESH_BLEND_TAG_INDEX==3
layout(location=3) out highp uvec4 meshBlendTagOutput;
#else
layout(location=3) out highp vec4 glFragData3;
#endif
#endif
#if {X}>4
#if PREPASS_MESH_BLEND_TAG_INDEX==4
layout(location=4) out highp uvec4 meshBlendTagOutput;
#else
layout(location=4) out highp vec4 glFragData4;
#endif
#endif
#if {X}>5
#if PREPASS_MESH_BLEND_TAG_INDEX==5
layout(location=5) out highp uvec4 meshBlendTagOutput;
#else
layout(location=5) out highp vec4 glFragData5;
#endif
#endif
#if {X}>6
#if PREPASS_MESH_BLEND_TAG_INDEX==6
layout(location=6) out highp uvec4 meshBlendTagOutput;
#else
layout(location=6) out highp vec4 glFragData6;
#endif
#endif
#if {X}>7
#if PREPASS_MESH_BLEND_TAG_INDEX==7
layout(location=7) out highp uvec4 meshBlendTagOutput;
#else
layout(location=7) out highp vec4 glFragData7;
#endif
#endif
void writeGeometryFragmentOutput(highp int index,highp vec4 value) {
#if {X}>0 && PREPASS_MESH_BLEND_TAG_INDEX != 0
if (index==0) { glFragData0=value; }
#endif
#if {X}>1 && PREPASS_MESH_BLEND_TAG_INDEX != 1
if (index==1) { glFragData1=value; }
#endif
#if {X}>2 && PREPASS_MESH_BLEND_TAG_INDEX != 2
if (index==2) { glFragData2=value; }
#endif
#if {X}>3 && PREPASS_MESH_BLEND_TAG_INDEX != 3
if (index==3) { glFragData3=value; }
#endif
#if {X}>4 && PREPASS_MESH_BLEND_TAG_INDEX != 4
if (index==4) { glFragData4=value; }
#endif
#if {X}>5 && PREPASS_MESH_BLEND_TAG_INDEX != 5
if (index==5) { glFragData5=value; }
#endif
#if {X}>6 && PREPASS_MESH_BLEND_TAG_INDEX != 6
if (index==6) { glFragData6=value; }
#endif
#if {X}>7 && PREPASS_MESH_BLEND_TAG_INDEX != 7
if (index==7) { glFragData7=value; }
#endif
}
#define WRITE_GEOMETRY_FRAGMENT_OUTPUT(INDEX,VALUE) writeGeometryFragmentOutput(INDEX,VALUE)
#else
layout(location=0) out highp vec4 glFragData[{X}];
#define WRITE_GEOMETRY_FRAGMENT_OUTPUT(INDEX,VALUE) gl_FragData[INDEX]=VALUE
#endif
highp vec4 gl_FragColor;
#ifndef PREPASS_CUSTOM_VARYINGS
#ifdef PREPASS_LOCAL_POSITION
varying highp vec3 vPosition;
#endif
#ifdef PREPASS_DEPTH
varying highp vec3 vViewPos;
#endif
#ifdef PREPASS_NORMALIZED_VIEW_DEPTH
varying highp float vNormViewDepth;
#endif
#if (defined(PREPASS_VELOCITY) || defined(PREPASS_VELOCITY_LINEAR)) && !defined(PREPASS_VELOCITY_ZERO)
varying highp vec4 vCurrentPosition;varying highp vec4 vPreviousPosition;
#endif
#endif
#ifdef PREPASS_OBJECT_ID
uniform highp float objectId;
#include<objectIdFunctions>
#endif
#ifdef PREPASS_MESH_BLEND_TAG
uniform highp int meshBlendTag;
#endif
#endif
`;i.f.IncludesShadersStore[o]||(i.f.IncludesShadersStore[o]=f),e.s(["f",0,{name:o,shader:f}])},18192,e=>{"use strict";var i=e.i(47662),o=e.i(81239),f=e.i(45224),t=e.i(71154),n=e.i(71194),a=e.i(78144);let E="packingFunctions",d=`vec4 pack(float depth)
{const vec4 bit_shift=vec4(255.0*255.0*255.0,255.0*255.0,255.0,1.0);const vec4 bit_mask=vec4(0.0,1.0/255.0,1.0/255.0,1.0/255.0);vec4 res=fract(depth*bit_shift);res-=res.xxyz*bit_mask;return res;}
float unpack(vec4 color)
{const vec4 bit_shift=vec4(1.0/(255.0*255.0*255.0),1.0/(255.0*255.0),1.0/255.0,1.0);return dot(color,bit_shift);}`;i.f.IncludesShadersStore[E]||(i.f.IncludesShadersStore[E]=d);var r=e.i(49426),P=e.i(72079);let _="gaussianSplattingFragmentDeclaration",l=`vec4 gaussianColor(vec4 inColor)
{float A=-dot(vPosition,vPosition);if (A<-4.0) discard;float B=exp(A)*inColor.a;
#include<logDepthFragment>
vec3 color=inColor.rgb;
#ifdef FOG
#include<fogFragment>
#endif
return vec4(color,B);}
`;i.f.IncludesShadersStore[_]||(i.f.IncludesShadersStore[_]=l);var S=e.i(79939),g=e.i(55701);let c="gaussianSplattingPixelShader",s=`#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
#define PREPASS_CUSTOM_VARYINGS
#include<prePassDeclaration>[SCENE_MRT_COUNT]
#if defined(GPUPICKER_DEPTH) && !defined(PREPASS)
layout(location=0) out highp vec4 glFragData[2];
#endif
#ifdef GPUPICKER_PACK_DEPTH
#include<packingFunctions>
#endif
varying vec4 vColor;varying vec2 vPosition;
#ifdef PREPASS
uniform float geometryZeroAlphaDiscard;
#ifdef PREPASS_POSITION
varying vec3 vGeometryPositionW;
#endif
#ifdef PREPASS_LOCAL_POSITION
varying vec3 vGeometryPositionL;
#endif
#ifdef PREPASS_DEPTH
varying float vGeometryViewDepth;
#endif
#ifdef PREPASS_NORMALIZED_VIEW_DEPTH
varying float vGeometryNormalizedViewDepth;
#endif
#ifdef PREPASS_NORMAL
varying vec3 vGeometryNormalV;
#endif
#ifdef PREPASS_WORLD_NORMAL
varying vec3 vGeometryNormalW;
#endif
#if defined(PREPASS_ALBEDO) || defined(PREPASS_ALBEDO_SQRT)
varying vec3 vGeometryAlbedo;
#endif
#if defined(PREPASS_VELOCITY) || defined(PREPASS_VELOCITY_LINEAR)
varying vec4 vGeometryCurrentPosition;varying vec4 vGeometryPreviousPosition;
#endif
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
#include<gaussianSplattingFragmentDeclaration>
void main () {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
vec4 finalColor=gaussianColor(vColor);
#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR
#ifdef PREPASS
if (finalColor.a<=0.0 && geometryZeroAlphaDiscard>0.0) {discard;}
vec4 geometryColor=finalColor;
#if defined(PREPASS_ALBEDO) || defined(PREPASS_ALBEDO_SQRT)
vec3 geometryAlbedo=vGeometryAlbedo;
#endif
#ifdef PREPASS_POSITION
vec3 geometryPositionW=vGeometryPositionW;
#endif
#ifdef PREPASS_LOCAL_POSITION
vec3 geometryPositionL=vGeometryPositionL;
#endif
#ifdef PREPASS_DEPTH
float geometryViewDepth=vGeometryViewDepth;
#endif
#ifdef PREPASS_NORMALIZED_VIEW_DEPTH
float geometryNormalizedViewDepth=vGeometryNormalizedViewDepth;
#endif
#ifdef PREPASS_NORMAL
vec3 geometryNormalV=vGeometryNormalV;
#endif
#ifdef PREPASS_WORLD_NORMAL
vec3 geometryNormalW=vGeometryNormalW;
#endif
#if defined(PREPASS_VELOCITY) || defined(PREPASS_VELOCITY_LINEAR)
vec4 geometryCurrentPosition=vGeometryCurrentPosition;vec4 geometryPreviousPosition=vGeometryPreviousPosition;
#endif
#include<geometryRenderingFragment>
#elif defined(GPUPICKER_DEPTH)
glFragData[0]=finalColor;
#ifdef GPUPICKER_PACK_DEPTH
glFragData[1]=pack(gl_FragCoord.z);
#else
glFragData[1]=vec4(gl_FragCoord.z,0.0,0.0,1.0);
#endif
#else
gl_FragColor=finalColor;
#endif
#define CUSTOM_FRAGMENT_MAIN_END
}
`;for(let e of(i.f.ShadersStore[c]||(i.f.ShadersStore[c]=s),[o.f,f.f,t.f,n.f,a.f,{name:E,shader:d},r.f,P.f,{name:_,shader:l},S.f,g.f]))i.f.IncludesShadersStore[e.name]||(i.f.IncludesShadersStore[e.name]=e.shader);e.s(["gaussianSplattingPixelShader",0,{name:c,shader:s}],18192)}]);