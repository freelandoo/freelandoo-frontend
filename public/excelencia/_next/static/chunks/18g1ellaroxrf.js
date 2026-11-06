(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,85633,e=>{"use strict";var r=e.i(47662);let f="harmonicsFunctions",i=`#ifdef USESPHERICALFROMREFLECTIONMAP
#ifdef SPHERICAL_HARMONICS
fn computeEnvironmentIrradiance(normal: vec3f)->vec3f {return uniforms.vSphericalL00
+ uniforms.vSphericalL1_1*(normal.y)
+ uniforms.vSphericalL10*(normal.z)
+ uniforms.vSphericalL11*(normal.x)
+ uniforms.vSphericalL2_2*(normal.y*normal.x)
+ uniforms.vSphericalL2_1*(normal.y*normal.z)
+ uniforms.vSphericalL20*((3.0*normal.z*normal.z)-1.0)
+ uniforms.vSphericalL21*(normal.z*normal.x)
+ uniforms.vSphericalL22*(normal.x*normal.x-(normal.y*normal.y));}
#else
fn computeEnvironmentIrradiance(normal: vec3f)->vec3f {var Nx: f32=normal.x;var Ny: f32=normal.y;var Nz: f32=normal.z;var C1: vec3f=uniforms.vSphericalZZ.rgb;var Cx: vec3f=uniforms.vSphericalX.rgb;var Cy: vec3f=uniforms.vSphericalY.rgb;var Cz: vec3f=uniforms.vSphericalZ.rgb;var Cxx_zz: vec3f=uniforms.vSphericalXX_ZZ.rgb;var Cyy_zz: vec3f=uniforms.vSphericalYY_ZZ.rgb;var Cxy: vec3f=uniforms.vSphericalXY.rgb;var Cyz: vec3f=uniforms.vSphericalYZ.rgb;var Czx: vec3f=uniforms.vSphericalZX.rgb;var a1: vec3f=Cyy_zz*Ny+Cy;var a2: vec3f=Cyz*Nz+a1;var b1: vec3f=Czx*Nz+Cx;var b2: vec3f=Cxy*Ny+b1;var b3: vec3f=Cxx_zz*Nx+b2;var t1: vec3f=Cz *Nz+C1;var t2: vec3f=a2 *Ny+t1;var t3: vec3f=b3 *Nx+t2;return t3;}
#endif
#endif
`;r.f.IncludesShadersStoreWGSL[f]||(r.f.IncludesShadersStoreWGSL[f]=i),e.s(["f",0,{name:f,shader:i}])},64500,e=>{"use strict";var r=e.i(47662);let f="helperFunctions",i=`const PI: f32=3.1415926535897932384626433832795;const TWO_PI: f32=6.283185307179586;const HALF_PI: f32=1.5707963267948966;const RECIPROCAL_PI: f32=0.3183098861837907;const RECIPROCAL_PI2: f32=0.15915494309189535;const RECIPROCAL_PI4: f32=0.07957747154594767;const HALF_MIN: f32=5.96046448e-08; 
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
`;r.f.IncludesShadersStoreWGSL[f]||(r.f.IncludesShadersStoreWGSL[f]=i),e.s(["f",0,{name:f,shader:i}])},47193,e=>{"use strict";var r=e.i(47662);let f="logDepthDeclaration",i=`#ifdef LOGARITHMICDEPTH
uniform logarithmicDepthConstant: f32;varying vFragmentDepth: f32;
#endif
`;r.f.IncludesShadersStoreWGSL[f]||(r.f.IncludesShadersStoreWGSL[f]=i),e.s(["f",0,{name:f,shader:i}])},72033,e=>{"use strict";var r=e.i(47662);let f="mainUVVaryingDeclaration",i=`#ifdef MAINUV{X}
varying vMainUV{X}: vec2f;
#endif
`;r.f.IncludesShadersStoreWGSL[f]||(r.f.IncludesShadersStoreWGSL[f]=i),e.s(["f",0,{name:f,shader:i}])},80239,e=>{"use strict";var r=e.i(47662);let f="meshUboDeclaration",i=`struct Mesh {world : mat4x4<f32>,
visibility : f32,};var<uniform> mesh : Mesh;
#define WORLD_UBO
`;r.f.IncludesShadersStoreWGSL[f]||(r.f.IncludesShadersStoreWGSL[f]=i),e.s(["f",0,{name:f,shader:i}])},51248,66608,74005,e=>{"use strict";var r=e.i(47662);let f="openpbrDielectricReflectance",i=`struct ReflectanceParams
{F0: f32,
F90: f32,
coloredF0: vec3f,
coloredF90: vec3f,};
#define pbr_inline
fn dielectricReflectance(
insideIOR: f32,outsideIOR: f32,specularColor: vec3f,specularWeight: f32
)->ReflectanceParams
{var outParams: ReflectanceParams;let dielectricF0=pow((insideIOR-outsideIOR)/(insideIOR+outsideIOR),2.0);let f90Scale=clamp(2.0f*abs(insideIOR-outsideIOR),0.0f,1.0f);
#if (DIELECTRIC_SPECULAR_MODEL==DIELECTRIC_SPECULAR_MODEL_OPENPBR)
let dielectricColorF90: vec3f=specularColor.rgb*vec3f(f90Scale);
#else
let dielectricColorF90: vec3f=vec3f(f90Scale);
#endif
#if DIELECTRIC_SPECULAR_MODEL==DIELECTRIC_SPECULAR_MODEL_GLTF
let maxF0=max(specularColor.r,max(specularColor.g,specularColor.b));outParams.F0=dielectricF0*maxF0*specularWeight;
#else
outParams.F0=dielectricF0*specularWeight;
#endif
outParams.F90=f90Scale*specularWeight;outParams.coloredF0=vec3f(dielectricF0*specularWeight)*specularColor.rgb;outParams.coloredF90=dielectricColorF90*vec3f(specularWeight);return outParams;}
`;r.f.IncludesShadersStoreWGSL[f]||(r.f.IncludesShadersStoreWGSL[f]=i),e.s(["f",0,{name:f,shader:i}],51248);let n="openpbrGeometryInfo",t=`struct geometryInfoOutParams
{NdotV: f32,
NdotVUnclamped: f32,
environmentBrdf: vec3f,
horizonOcclusion: f32};struct geometryInfoAnisoOutParams
{NdotV: f32,
NdotVUnclamped: f32,
environmentBrdf: vec3f,
horizonOcclusion: f32,
anisotropy: f32,
anisotropicTangent: vec3f,
anisotropicBitangent: vec3f,
TBN: mat3x3<f32>};fn geometryInfo(
normalW: vec3f,viewDirectionW: vec3f,roughness: f32,geometricNormalW: vec3f
)->geometryInfoOutParams
{var outParams: geometryInfoOutParams;outParams.NdotVUnclamped=dot(normalW,viewDirectionW);outParams.NdotV=absEps(outParams.NdotVUnclamped);
#if defined(ENVIRONMENTBRDF)
outParams.environmentBrdf=getBRDFLookup(outParams.NdotV,roughness);
#else
outParams.environmentBrdf=vec3f(0.0);
#endif
outParams.horizonOcclusion=1.0f;
#if defined(ENVIRONMENTBRDF) && !defined(REFLECTIONMAP_SKYBOX)
#ifdef HORIZONOCCLUSION
#if defined(GEOMETRY_NORMAL) || defined(GEOMETRY_COAT_NORMAL)
#ifdef REFLECTIONMAP_3D
outParams.horizonOcclusion=environmentHorizonOcclusion(-viewDirectionW,normalW,geometricNormalW);
#endif
#endif
#endif
#endif
return outParams;}
fn geometryInfoAniso(
normalW: vec3f,viewDirectionW: vec3f,roughness: f32,geometricNormalW: vec3f
,vAnisotropy: vec3f,TBN: mat3x3<f32>
)->geometryInfoAnisoOutParams
{let geoInfo: geometryInfoOutParams=geometryInfo(normalW,viewDirectionW,roughness,geometricNormalW);var outParams: geometryInfoAnisoOutParams;outParams.NdotV=geoInfo.NdotV;outParams.NdotVUnclamped=geoInfo.NdotVUnclamped;outParams.environmentBrdf=geoInfo.environmentBrdf;outParams.horizonOcclusion=geoInfo.horizonOcclusion;outParams.anisotropy=vAnisotropy.b;let anisotropyDirection: vec3f=vec3f(vAnisotropy.xy,0.);let anisoTBN: mat3x3<f32>=mat3x3<f32>(normalize(TBN[0]),normalize(TBN[1]),normalize(TBN[2]));outParams.anisotropicTangent=normalize(anisoTBN*anisotropyDirection);outParams.anisotropicBitangent=normalize(cross(anisoTBN[2],outParams.anisotropicTangent));outParams.TBN=TBN;return outParams;}
`;r.f.IncludesShadersStoreWGSL[n]||(r.f.IncludesShadersStoreWGSL[n]=t),e.s(["f",0,{name:n,shader:t}],66608);let o="openpbrIblFunctions",a=`#ifdef REFLECTION
fn sampleIrradiance(
surfaceNormal: vec3f
#if defined(NORMAL) && defined(USESPHERICALINVERTEX)
,vEnvironmentIrradianceSH: vec3f
#endif
#if (defined(USESPHERICALFROMREFLECTIONMAP) && (!defined(NORMAL) || !defined(USESPHERICALINVERTEX))) || (defined(USEIRRADIANCEMAP) && defined(REFLECTIONMAP_3D))
,iblMatrix: mat4x4f
#endif
#ifdef USEIRRADIANCEMAP
#ifdef REFLECTIONMAP_3D
,irradianceSampler: texture_cube<f32>
,irradianceSamplerSampler: sampler
#else
,irradianceSampler: texture_2d<f32>
,irradianceSamplerSampler: sampler
#endif
#ifdef USE_IRRADIANCE_DOMINANT_DIRECTION
,reflectionDominantDirection: vec3f
#endif
#endif
#ifdef REALTIME_FILTERING
,reflectionFilteringInfo: vec2f
#ifdef IBL_CDF_FILTERING
,icdfSampler: texture_2d<f32>
,icdfSamplerSampler: sampler
#endif
#endif
,reflectionInfos: vec2f
,viewDirectionW: vec3f
,diffuseRoughness: f32
,surfaceAlbedo: vec3f
)->vec3f {var environmentIrradiance=vec3f(0.,0.,0.);
#if (defined(USESPHERICALFROMREFLECTIONMAP) && (!defined(NORMAL) || !defined(USESPHERICALINVERTEX))) || (defined(USEIRRADIANCEMAP) && defined(REFLECTIONMAP_3D))
var irradianceVector=(iblMatrix*vec4f(surfaceNormal,0.0f)).xyz;var irradianceView=(iblMatrix*vec4f(viewDirectionW,0.0f)).xyz;
#if !defined(USE_IRRADIANCE_DOMINANT_DIRECTION) && !defined(REALTIME_FILTERING)
#if BASE_DIFFUSE_MODEL != BRDF_DIFFUSE_MODEL_LAMBERT && BASE_DIFFUSE_MODEL != BRDF_DIFFUSE_MODEL_LEGACY
{let NdotV=max(dot(surfaceNormal,viewDirectionW),0.0f);irradianceVector=mix(irradianceVector,irradianceView,(0.5f*(1.0f-NdotV))*diffuseRoughness);}
#endif
#endif
#ifdef REFLECTIONMAP_OPPOSITEZ
irradianceVector.z*=-1.0;irradianceView.z*=-1.0;
#endif
#ifdef INVERTCUBICMAP
irradianceVector.y*=-1.0;irradianceView.y*=-1.0;
#endif
#endif
#ifdef USESPHERICALFROMREFLECTIONMAP
#if defined(NORMAL) && defined(USESPHERICALINVERTEX)
environmentIrradiance=vEnvironmentIrradianceSH;
#else
#if defined(REALTIME_FILTERING)
environmentIrradiance=irradiance(reflectionSampler,reflectionSamplerSampler,irradianceVector,reflectionFilteringInfo,diffuseRoughness,surfaceAlbedo,irradianceView
#ifdef IBL_CDF_FILTERING
,icdfSampler
,icdfSamplerSampler
#endif
);
#else
environmentIrradiance=computeEnvironmentIrradiance(irradianceVector);
#endif
#endif
#elif defined(USEIRRADIANCEMAP)
#ifdef REFLECTIONMAP_3D
let environmentIrradianceFromTexture: vec4f=textureSample(irradianceSampler,irradianceSamplerSampler,irradianceVector);
#else
let environmentIrradianceFromTexture: vec4f=textureSample(irradianceSampler,irradianceSamplerSampler,reflectionCoords);
#endif
environmentIrradiance=environmentIrradianceFromTexture.rgb;
#ifdef RGBDREFLECTION
environmentIrradiance.rgb=fromRGBD(environmentIrradianceFromTexture);
#endif
#ifdef GAMMAREFLECTION
environmentIrradiance.rgb=toLinearSpaceVec3(environmentIrradiance.rgb);
#endif
#ifdef USE_IRRADIANCE_DOMINANT_DIRECTION
let Ls: vec3f=normalize(reflectionDominantDirection);let NoL: f32=dot(irradianceVector,Ls);let NoV: f32=dot(irradianceVector,irradianceView);var diffuseRoughnessTerm=vec3f(1.0f);
#if BASE_DIFFUSE_MODEL==BRDF_DIFFUSE_MODEL_EON
let LoV: f32=dot (Ls,irradianceView);let mag: f32=length(reflectionDominantDirection)*2.0f;let clampedAlbedo: vec3f=clamp(surfaceAlbedo,vec3f(0.1f),vec3f(1.0f));diffuseRoughnessTerm=diffuseBRDF_EON(clampedAlbedo,diffuseRoughness,NoL,NoV,LoV)*PI;diffuseRoughnessTerm=diffuseRoughnessTerm/clampedAlbedo;diffuseRoughnessTerm=mix(vec3f(1.0f),diffuseRoughnessTerm,sqrt(clamp(mag*NoV,0.0f,1.0f)));
#elif BASE_DIFFUSE_MODEL==BRDF_DIFFUSE_MODEL_BURLEY
let H: vec3f=(irradianceView+Ls)*0.5f;let VoH: f32=dot(irradianceView,H);diffuseRoughnessTerm=vec3f(diffuseBRDF_Burley(NoL,NoV,VoH,diffuseRoughness)*PI);
#endif
environmentIrradiance=environmentIrradiance.rgb*diffuseRoughnessTerm;
#endif
#endif
environmentIrradiance*=reflectionInfos.x;return environmentIrradiance;}
#ifdef REFLECTIONMAP_3D
fn createReflectionCoords(vPositionW: vec3f,normalW: vec3f)->vec3f
#else
fn createReflectionCoords(vPositionW: vec3f,normalW: vec3f)->vec2f
#endif
{var reflectionVector: vec3f=computeReflectionCoords(vec4f(vPositionW,1.0f),normalW);
#ifdef REFLECTIONMAP_OPPOSITEZ
reflectionVector.z*=-1.0;
#endif
#ifdef REFLECTIONMAP_3D
var reflectionCoords: vec3f=reflectionVector;
#else
var reflectionCoords: vec2f=reflectionVector.xy;
#ifdef REFLECTIONMAP_PROJECTION
reflectionCoords/=reflectionVector.z;
#endif
reflectionCoords.y=1.0f-reflectionCoords.y;
#endif
return reflectionCoords;}
fn sampleRadiance(
alphaG: f32
,reflectionMicrosurfaceInfos: vec3f
,reflectionInfos: vec2f
,geoInfo: geometryInfoOutParams
#ifdef REFLECTIONMAP_3D
,reflectionSampler: texture_cube<f32>
,reflectionSamplerSampler: sampler
,reflectionCoords: vec3f
#else
,reflectionSampler: texture_2d<f32>
,reflectionSamplerSampler: sampler
,reflectionCoords: vec2f
#endif
#ifdef REALTIME_FILTERING
,reflectionFilteringInfo: vec2f
#endif
)->vec3f {var environmentRadiance: vec4f=vec4f(0.f,0.f,0.f,0.f);
#if defined(LODINREFLECTIONALPHA) && !defined(REFLECTIONMAP_SKYBOX)
var reflectionLOD: f32=getLodFromAlphaG(reflectionMicrosurfaceInfos.x,alphaG,geoInfo.NdotVUnclamped);
#elif defined(LINEARSPECULARREFLECTION)
var reflectionLOD: f32=getLinearLodFromRoughness(reflectionMicrosurfaceInfos.x,roughness);
#else
var reflectionLOD: f32=getLodFromAlphaG(reflectionMicrosurfaceInfos.x,alphaG);
#endif
reflectionLOD=reflectionLOD*reflectionMicrosurfaceInfos.y+reflectionMicrosurfaceInfos.z;
#ifdef REALTIME_FILTERING
environmentRadiance=vec4f(radiance(alphaG,reflectionSampler,reflectionSamplerSampler,reflectionCoords,reflectionFilteringInfo),1.0f);
#else
environmentRadiance=textureSampleLevel(reflectionSampler,reflectionSamplerSampler,reflectionCoords,reflectionLOD);
#endif
var envRadiance: vec3f=environmentRadiance.rgb;
#ifdef RGBDREFLECTION
envRadiance=fromRGBD(environmentRadiance);
#endif
#ifdef GAMMAREFLECTION
envRadiance=toLinearSpaceVec3(environmentRadiance.rgb);
#endif
envRadiance*=reflectionInfos.x;return envRadiance;}
#if defined(ANISOTROPIC)
fn sampleRadianceAnisotropic(
alphaG: f32
,reflectionMicrosurfaceInfos: vec3f
,reflectionInfos: vec2f
,geoInfo: geometryInfoAnisoOutParams
,normalW: vec3f
,viewDirectionW: vec3f
,positionW: vec3f
,noise: vec3f
,isRefraction: bool
,ior: f32
#ifdef REFLECTIONMAP_3D
,reflectionSampler: texture_cube<f32>
,reflectionSamplerSampler: sampler
#else
,reflectionSampler: texture_2d<f32>
,reflectionSamplerSampler: sampler
#endif
#ifdef REALTIME_FILTERING
,reflectionFilteringInfo: vec2f
#endif
)->vec3f {var environmentRadiance: vec4f=vec4f(0.f,0.f,0.f,0.f);let alphaT=alphaG*sqrt(2.0f/(1.0f+(1.0f-geoInfo.anisotropy)*(1.0f-geoInfo.anisotropy)));let alphaB=(1.0f-geoInfo.anisotropy)*alphaT;let modifiedAlphaG=alphaB;
#if defined(LODINREFLECTIONALPHA) && !defined(REFLECTIONMAP_SKYBOX)
var reflectionLOD: f32=getLodFromAlphaG(reflectionMicrosurfaceInfos.x,modifiedAlphaG,geoInfo.NdotVUnclamped);
#elif defined(LINEARSPECULARREFLECTION)
var reflectionLOD: f32=getLinearLodFromRoughness(reflectionMicrosurfaceInfos.x,roughness);
#else
var reflectionLOD: f32=getLodFromAlphaG(reflectionMicrosurfaceInfos.x,modifiedAlphaG);
#endif
reflectionLOD=reflectionLOD*reflectionMicrosurfaceInfos.y+reflectionMicrosurfaceInfos.z;
#ifdef REALTIME_FILTERING
var view=(uniforms.reflectionMatrix*vec4f(viewDirectionW,0.0f)).xyz;var tangent=(uniforms.reflectionMatrix*vec4f(geoInfo.anisotropicTangent,0.0f)).xyz;var bitangent=(uniforms.reflectionMatrix*vec4f(geoInfo.anisotropicBitangent,0.0f)).xyz;var normal=(uniforms.reflectionMatrix*vec4f(normalW,0.0f)).xyz;
#ifdef REFLECTIONMAP_OPPOSITEZ
view.z*=-1.0f;tangent.z*=-1.0f;bitangent.z*=-1.0f;normal.z*=-1.0f;
#endif
environmentRadiance =
vec4f(radianceAnisotropic(alphaT,alphaB,reflectionSampler,reflectionSamplerSampler,
view,tangent,
bitangent,normal,
reflectionFilteringInfo,noise.xy,isRefraction,ior),
1.0f);
#else
const samples: i32=16;var radianceSample=vec4f(0.0);var accumulatedRadiance=vec3f(0.0);var sample_weight=0.0f;var total_weight=0.0f;let step=1.0f/f32(max(samples-1,1));for (var i: i32=0; i<samples; i++) {var t: f32=mix(-1.0,1.0,f32(i)*step);t+=step*2.0*noise.x;sample_weight=max(1.0-abs(t),0.001);sample_weight*=sample_weight;t*=min(4.0*alphaT*geoInfo.anisotropy,1.0);var bentNormal: vec3f;if (t<0.0) {let blend: f32=t+1.0;bentNormal=normalize(mix(-geoInfo.anisotropicTangent,normalW,blend));} else if (t>0.0) {let blend: f32=t;bentNormal=normalize(mix(normalW,geoInfo.anisotropicTangent,blend));} else {bentNormal=normalW;}
#ifdef REFLECTIONMAP_3D
var reflectionCoords: vec3f;if (isRefraction) {reflectionCoords=double_refract(-viewDirectionW,bentNormal,ior);} else {reflectionCoords=reflect(-viewDirectionW,bentNormal);}
reflectionCoords=(uniforms.reflectionMatrix*vec4f(reflectionCoords,0.f)).xyz;
#ifdef REFLECTIONMAP_OPPOSITEZ
reflectionCoords.z*=-1.0f;
#endif
#else
var sampleDirection: vec3f;if (isRefraction) {sampleDirection=double_refract(-viewDirectionW,bentNormal,ior);} else {sampleDirection=reflect(-viewDirectionW,bentNormal);}
let originalViewDirectionW: vec3f=normalize(scene.vEyePosition.xyz-positionW);let mappingNormalCandidate: vec3f=originalViewDirectionW+sampleDirection;var mappingNormal: vec3f;if (dot(mappingNormalCandidate,mappingNormalCandidate)>Epsilon) {mappingNormal=normalize(mappingNormalCandidate);} else {let perpendicularAxis: vec3f=select(vec3f(0.0f,1.0f,0.0f),vec3f(1.0f,0.0f,0.0f),abs(originalViewDirectionW.x)<0.9f);mappingNormal=normalize(cross(originalViewDirectionW,perpendicularAxis));}
let reflectionCoords: vec2f=createReflectionCoords(positionW,mappingNormal);
#endif
radianceSample=textureSampleLevel(reflectionSampler,reflectionSamplerSampler,reflectionCoords,reflectionLOD);
#ifdef RGBDREFLECTION
accumulatedRadiance+=vec3f(sample_weight)*fromRGBD(radianceSample);
#elif defined(GAMMAREFLECTION)
accumulatedRadiance+=vec3f(sample_weight)*toLinearSpaceVec3(radianceSample.rgb);
#else
accumulatedRadiance+=vec3f(sample_weight)*radianceSample.rgb;
#endif
total_weight+=sample_weight;}
environmentRadiance=vec4f(accumulatedRadiance/vec3f(total_weight),1.0f);
#endif
environmentRadiance=vec4f(environmentRadiance.rgb*reflectionInfos.xxx,environmentRadiance.a);return environmentRadiance.rgb;}
#endif
#endif
#ifdef ENVIRONMENTBRDF
fn computeDielectricIblFresnel(reflectance: ReflectanceParams,environmentBrdf: vec3f)->f32
{let dielectricIblFresnel: f32=getReflectanceFromBRDFWithEnvLookup(vec3f(reflectance.F0),vec3f(reflectance.F90),environmentBrdf).r;let dielectricECF: f32=1.0+reflectance.F0*(1.0/environmentBrdf.y-1.0);return clamp(dielectricIblFresnel*dielectricECF,0.0,1.0);}
fn computeConductorIblFresnel(reflectance: ReflectanceParams,environmentBrdf: vec3f)->vec3f
{
#if (CONDUCTOR_SPECULAR_MODEL==CONDUCTOR_SPECULAR_MODEL_OPENPBR)
let openPBRBrdf: vec3f=vec3f(environmentBrdf.xy,environmentBrdf.z/BRDF_Z_SCALE);let b: vec3f =getF82B(reflectance.coloredF0,reflectance.coloredF90);let E_F82: vec3f=getF82DirectionalAlbedo(reflectance.coloredF0,vec3f(1.0),b,openPBRBrdf);let F_avg: vec3f=getF82AverageFresnel(reflectance.coloredF0,b);let ECF: vec3f =vec3f(1.0)+F_avg*(vec3f(1.0)/openPBRBrdf.y-vec3f(1.0));return clamp(E_F82*ECF,vec3f(0.0),vec3f(1.0));
#else
return getReflectanceFromBRDFLookup(reflectance.coloredF0,reflectance.coloredF90,environmentBrdf);
#endif
}
#endif
`;r.f.IncludesShadersStoreWGSL[o]||(r.f.IncludesShadersStoreWGSL[o]=a),e.s(["f",0,{name:o,shader:a}],74005)},10871,e=>{"use strict";var r=e.i(47662);let f="openpbrSubsurfaceLayerData",i=`var subsurface_weight: f32=uniforms.vSubsurfaceWeight;var subsurface_color: vec3f=uniforms.vSubsurfaceColor.rgb;var subsurface_radius: f32=uniforms.vSubsurfaceRadius;var subsurface_radius_scale: vec3f=uniforms.vSubsurfaceRadiusScale;var subsurface_scatter_anisotropy: f32=clamp(uniforms.vSubsurfaceScatterAnisotropy,-0.9999f,0.9999f);
#ifdef SUBSURFACE_WEIGHT
let subsurfaceWeightFromTexture: vec4f=TEXRD(subsurfaceWeightSampler,subsurfaceWeightSamplerSampler,fragmentInputs.vSubsurfaceWeightUV+uvOffset);
#endif
#ifdef SUBSURFACE_COLOR
let subsurfaceColorFromTexture: vec4f=TEXRD(subsurfaceColorSampler,subsurfaceColorSamplerSampler,fragmentInputs.vSubsurfaceColorUV+uvOffset);
#endif
#ifdef SUBSURFACE_RADIUS_SCALE
let subsurfaceRadiusScaleFromTexture: vec4f=TEXRD(subsurfaceRadiusScaleSampler,subsurfaceRadiusScaleSamplerSampler,fragmentInputs.vSubsurfaceRadiusScaleUV+uvOffset);
#endif
#ifdef SUBSURFACE_WEIGHT
#ifdef SUBSURFACE_WEIGHT_FROM_TEXTURE_ALPHA
subsurface_weight*=subsurfaceWeightFromTexture.a;
#else
subsurface_weight*=subsurfaceWeightFromTexture.r;
#endif
#endif
#ifdef SUBSURFACE_COLOR
#ifdef SUBSURFACE_COLOR_GAMMA
subsurface_color*=toLinearSpaceVec3(subsurfaceColorFromTexture.rgb);
#else
subsurface_color*=subsurfaceColorFromTexture.rgb;
#endif
subsurface_color*=uniforms.vSubsurfaceColorInfos.y;
#endif
#ifdef SUBSURFACE_RADIUS_SCALE
subsurface_radius_scale*=subsurfaceRadiusScaleFromTexture.rgb;
#endif
`;r.f.IncludesShadersStoreWGSL[f]||(r.f.IncludesShadersStoreWGSL[f]=i),e.s(["f",0,{name:f,shader:i}])},77132,e=>{"use strict";var r=e.i(47662);let f="openpbrTransmissionLayerData",i=`var transmission_weight: f32=uniforms.vTransmissionWeight;var transmission_color: vec3f=uniforms.vTransmissionColor.rgb;var transmission_depth: f32=uniforms.vTransmissionDepth;var transmission_scatter: vec3f=uniforms.vTransmissionScatter.rgb;var transmission_scatter_anisotropy: f32=clamp(uniforms.vTransmissionScatterAnisotropy,-0.9999f,0.9999f);var transmission_dispersion_scale: f32=uniforms.vTransmissionDispersionScale;var transmission_dispersion_abbe_number: f32=uniforms.vTransmissionDispersionAbbeNumber;
#ifdef TRANSMISSION_WEIGHT
let transmissionWeightFromTexture: vec4f=TEXRD(transmissionWeightSampler,transmissionWeightSamplerSampler,fragmentInputs.vTransmissionWeightUV+uvOffset);
#endif
#ifdef TRANSMISSION_COLOR
let transmissionColorFromTexture: vec4f=TEXRD(transmissionColorSampler,transmissionColorSamplerSampler,fragmentInputs.vTransmissionColorUV+uvOffset);
#endif
#ifdef TRANSMISSION_DEPTH
let transmissionDepthFromTexture: vec4f=TEXRD(transmissionDepthSampler,transmissionDepthSamplerSampler,fragmentInputs.vTransmissionDepthUV+uvOffset);
#endif
#ifdef TRANSMISSION_SCATTER
let transmissionScatterFromTexture: vec4f=TEXRD(transmissionScatterSampler,transmissionScatterSamplerSampler,fragmentInputs.vTransmissionScatterUV+uvOffset);
#endif
#ifdef TRANSMISSION_DISPERSION_SCALE
let transmissionDispersionScaleFromTexture: vec4f=TEXRD(transmissionDispersionScaleSampler,transmissionDispersionScaleSamplerSampler,fragmentInputs.vTransmissionDispersionScaleUV+uvOffset);
#endif
#ifdef TRANSMISSION_WEIGHT
transmission_weight*=transmissionWeightFromTexture.r;
#endif
#ifdef TRANSMISSION_COLOR
#ifdef TRANSMISSION_COLOR_GAMMA
transmission_color*=toLinearSpaceVec3(transmissionColorFromTexture.rgb);
#else
transmission_color*=transmissionColorFromTexture.rgb;
#endif
transmission_color*=uniforms.vTransmissionColorInfos.y;
#endif
#ifdef TRANSMISSION_DEPTH
transmission_depth*=transmissionDepthFromTexture.r;
#endif
#ifdef TRANSMISSION_SCATTER
transmission_scatter*=transmissionScatterFromTexture.rgb;
#endif
#ifdef TRANSMISSION_DISPERSION_SCALE
transmission_dispersion_scale*=transmissionDispersionScaleFromTexture.r;
#endif
`;r.f.IncludesShadersStoreWGSL[f]||(r.f.IncludesShadersStoreWGSL[f]=i),e.s(["f",0,{name:f,shader:i}])},60777,e=>{"use strict";var r=e.i(47662);e.i(60896),e.i(80239);let f="openpbrUboDeclaration",i=`uniform vTangentSpaceParams: vec2f;uniform vLightingIntensity: vec4f;uniform pointSize: f32;uniform vDebugMode: vec2f;uniform renderTargetSize: vec2f;uniform cameraInfo: vec4f;uniform vTextureRepetitionHexTilingParams: vec4f;uniform backgroundRefractionMatrix: mat4x4f;uniform vBackgroundRefractionInfos: vec3f;uniform vReflectionInfos: vec2f;uniform reflectionMatrix: mat4x4f;uniform vReflectionMicrosurfaceInfos: vec3f;uniform vReflectionPosition: vec3f;uniform vReflectionSize: vec3f;uniform vReflectionFilteringInfo: vec2f;uniform vReflectionDominantDirection: vec3f;uniform vReflectionColor: vec3f;uniform vSphericalL00: vec3f;uniform vSphericalL1_1: vec3f;uniform vSphericalL10: vec3f;uniform vSphericalL11: vec3f;uniform vSphericalL2_2: vec3f;uniform vSphericalL2_1: vec3f;uniform vSphericalL20: vec3f;uniform vSphericalL21: vec3f;uniform vSphericalL22: vec3f;uniform vSphericalX: vec3f;uniform vSphericalY: vec3f;uniform vSphericalZ: vec3f;uniform vSphericalXX_ZZ: vec3f;uniform vSphericalYY_ZZ: vec3f;uniform vSphericalZZ: vec3f;uniform vSphericalXY: vec3f;uniform vSphericalYZ: vec3f;uniform vSphericalZX: vec3f;uniform vBaseWeight: f32;uniform vBaseColor: vec4f;uniform vBaseDiffuseRoughness: f32;uniform vReflectanceInfo: vec4f;uniform vSpecularColor: vec4f;uniform vSpecularAnisotropy: vec3f;uniform vTransmissionWeight : f32;uniform vTransmissionColor : vec3f;uniform vTransmissionDepth : f32;uniform vTransmissionScatter : vec3f;uniform vTransmissionScatterAnisotropy : f32;uniform vTransmissionDispersionScale : f32;uniform vTransmissionDispersionAbbeNumber : f32;uniform vSubsurfaceWeight: f32;uniform vSubsurfaceColor: vec3f;uniform vSubsurfaceRadius: f32;uniform vSubsurfaceRadiusScale: vec3f;uniform vSubsurfaceScatterAnisotropy: f32;uniform vCoatWeight: f32;uniform vCoatColor: vec3f;uniform vCoatRoughness: f32;uniform vCoatRoughnessAnisotropy: f32;uniform vCoatIor: f32;uniform vCoatDarkening : f32;uniform vFuzzWeight: f32;uniform vFuzzColor: vec3f;uniform vFuzzRoughness: f32;uniform vGeometryThinWalled: f32;uniform vGeometryCoatTangent: vec2f;uniform vGeometryThickness: f32;uniform vEmissionColor: vec3f;uniform vThinFilmWeight: f32;uniform vThinFilmThickness: vec2f;uniform vThinFilmIor: f32;uniform vBaseWeightInfos: vec2f;uniform baseWeightMatrix: mat4x4f;uniform vBaseColorInfos: vec2f;uniform baseColorMatrix: mat4x4f;uniform vBaseDiffuseRoughnessInfos: vec2f;uniform baseDiffuseRoughnessMatrix: mat4x4f;uniform vBaseMetalnessInfos: vec2f;uniform baseMetalnessMatrix: mat4x4f;uniform vSpecularWeightInfos: vec2f;uniform specularWeightMatrix: mat4x4f;uniform vSpecularColorInfos: vec2f;uniform specularColorMatrix: mat4x4f;uniform vSpecularRoughnessInfos: vec2f;uniform specularRoughnessMatrix: mat4x4f;uniform vSpecularRoughnessAnisotropyInfos: vec2f;uniform specularRoughnessAnisotropyMatrix: mat4x4f;uniform vTransmissionWeightInfos : vec2f;uniform transmissionWeightMatrix : mat4x4f;uniform vTransmissionColorInfos : vec2f;uniform transmissionColorMatrix : mat4x4f;uniform vTransmissionDepthInfos : vec2f;uniform transmissionDepthMatrix : mat4x4f;uniform vTransmissionScatterInfos : vec2f;uniform transmissionScatterMatrix : mat4x4f;uniform vTransmissionDispersionScaleInfos : vec2f;uniform transmissionDispersionScaleMatrix : mat4x4f;uniform vSubsurfaceWeightInfos: vec2f;uniform subsurfaceWeightMatrix: mat4x4f;uniform vSubsurfaceColorInfos: vec2f;uniform subsurfaceColorMatrix: mat4x4f;uniform vSubsurfaceRadiusScaleInfos: vec2f;uniform subsurfaceRadiusScaleMatrix: mat4x4f;uniform vCoatWeightInfos: vec2f;uniform coatWeightMatrix: mat4x4f;uniform vCoatColorInfos: vec2f;uniform coatColorMatrix: mat4x4f;uniform vCoatRoughnessInfos: vec2f;uniform coatRoughnessMatrix: mat4x4f;uniform vCoatRoughnessAnisotropyInfos: vec2f;uniform coatRoughnessAnisotropyMatrix: mat4x4f;uniform vCoatDarkeningInfos : vec2f;uniform coatDarkeningMatrix : mat4x4f;uniform vFuzzWeightInfos: vec2f;uniform fuzzWeightMatrix: mat4x4f;uniform vFuzzColorInfos: vec2f;uniform fuzzColorMatrix: mat4x4f;uniform vFuzzRoughnessInfos: vec2f;uniform fuzzRoughnessMatrix: mat4x4f;uniform vGeometryNormalInfos: vec2f;uniform geometryNormalMatrix: mat4x4f;uniform vGeometryTangentInfos: vec2f;uniform geometryTangentMatrix: mat4x4f;uniform vGeometryCoatNormalInfos: vec2f;uniform geometryCoatNormalMatrix: mat4x4f;uniform vGeometryCoatTangentInfos: vec2f;uniform geometryCoatTangentMatrix: mat4x4f;uniform vGeometryOpacityInfos: vec2f;uniform geometryOpacityMatrix: mat4x4f;uniform vGeometryThicknessInfos: vec2f;uniform geometryThicknessMatrix: mat4x4f;uniform vEmissionColorInfos: vec2f;uniform emissionColorMatrix: mat4x4f;uniform vThinFilmWeightInfos: vec2f;uniform thinFilmWeightMatrix: mat4x4f;uniform vThinFilmThicknessInfos: vec2f;uniform thinFilmThicknessMatrix: mat4x4f;uniform vAmbientOcclusionInfos: vec2f;uniform ambientOcclusionMatrix: mat4x4f;
#define ADDITIONAL_UBO_DECLARATION
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
`;r.f.IncludesShadersStoreWGSL[f]||(r.f.IncludesShadersStoreWGSL[f]=i),e.s(["f",0,{name:f,shader:i}])},45595,e=>{"use strict";var r=e.i(47662);let f="pbrBRDFFunctions",i=`#define FRESNEL_MAXIMUM_ON_ROUGH 0.25
#define BRDF_DIFFUSE_MODEL_EON 0
#define BRDF_DIFFUSE_MODEL_BURLEY 1
#define BRDF_DIFFUSE_MODEL_LAMBERT 2
#define BRDF_DIFFUSE_MODEL_LEGACY 3
#define DIELECTRIC_SPECULAR_MODEL_GLTF 0
#define DIELECTRIC_SPECULAR_MODEL_OPENPBR 1
#define CONDUCTOR_SPECULAR_MODEL_GLTF 0
#define CONDUCTOR_SPECULAR_MODEL_OPENPBR 1
#if !defined(PBR_VERTEX_SHADER) && !defined(OPENPBR_VERTEX_SHADER)
#ifdef MS_BRDF_ENERGY_CONSERVATION
fn getEnergyConservationFactor(specularEnvironmentR0: vec3f,environmentBrdf: vec3f)->vec3f {return 1.0+specularEnvironmentR0*(1.0/environmentBrdf.y-1.0);}
#endif
#if CONDUCTOR_SPECULAR_MODEL==CONDUCTOR_SPECULAR_MODEL_OPENPBR
const F82_COS_THETA_MAX: f32 =0.142857143;const F82_ONE_MINUS_CTM_POW5: f32 =0.462664366;const F82_ONE_MINUS_CTM_POW6: f32 =0.396569457;const F82_B_DENOMINATOR_RECIP: f32 =17.6512785;const BRDF_Z_SCALE: f32 =16.0;fn getF82Specular(NdotV: f32,F0: vec3f,edgeTint: vec3f,roughness: f32)->vec3f {let white_minus_F0: vec3f=vec3f(1.0f)-F0;let b_numerator: vec3f=(F0+white_minus_F0*F82_ONE_MINUS_CTM_POW5)*(vec3f(1.0)-edgeTint);let b: vec3f=b_numerator*F82_B_DENOMINATOR_RECIP;let cos_theta: f32=max(roughness,NdotV);let one_minus_cos_theta: f32=1.0-cos_theta;let offset_from_F0: vec3f=(white_minus_F0-b*cos_theta*one_minus_cos_theta)*pow(one_minus_cos_theta,5.0f);return clamp(F0+offset_from_F0,vec3f(0.0f),vec3f(1.0f));}
fn getF82B(F0: vec3f,edgeTint: vec3f)->vec3f {return (F0+(vec3f(1.0)-F0)*F82_ONE_MINUS_CTM_POW5)*(vec3f(1.0)-edgeTint)*F82_B_DENOMINATOR_RECIP;}
fn getF82DirectionalAlbedo(F0: vec3f,F90: vec3f,b: vec3f,environmentBrdf: vec3f)->vec3f {return (F90-F0)*environmentBrdf.x+F0*environmentBrdf.y-b*environmentBrdf.z;}
fn getF82AverageFresnel(F0: vec3f,b: vec3f)->vec3f {return F0+(vec3f(1.0)-F0)/21.0-b/126.0;}
#endif
#ifdef FUZZENVIRONMENTBRDF
fn getFuzzBRDFLookup(NdotV: f32,perceptualRoughness: f32)->vec3f {let UV: vec2f=vec2f(perceptualRoughness,NdotV);var brdfLookup: vec4f=textureSample(environmentFuzzBrdfSampler,environmentFuzzBrdfSamplerSampler,UV);const RiRange: vec2f=vec2f(0.0f,0.75f);const ARange: vec2f=vec2f(0.005f,0.88f);const BRange: vec2f=vec2f(-0.18f,0.002f);brdfLookup.r=mix(ARange.x, ARange.y, brdfLookup.r);brdfLookup.g=mix(BRange.x, BRange.y, brdfLookup.g);brdfLookup.b=mix(RiRange.x,RiRange.y,brdfLookup.b);return brdfLookup.rgb;}
#endif
#ifdef ENVIRONMENTBRDF
fn getBRDFLookup(NdotV: f32,perceptualRoughness: f32)->vec3f {var UV: vec2f= vec2f(NdotV,perceptualRoughness);var brdfLookup: vec4f= textureSample(environmentBrdfSampler,environmentBrdfSamplerSampler,UV);
#ifdef ENVIRONMENTBRDF_RGBD
brdfLookup=vec4f(fromRGBD(brdfLookup.rgba),brdfLookup.a);
#endif
return brdfLookup.rgb;}
fn getReflectanceFromBRDFWithEnvLookup(specularEnvironmentR0: vec3f,specularEnvironmentR90: vec3f,environmentBrdf: vec3f)->vec3f {
#ifdef BRDF_V_HEIGHT_CORRELATED
var reflectance: vec3f=(specularEnvironmentR90-specularEnvironmentR0)*environmentBrdf.x+specularEnvironmentR0*environmentBrdf.y;
#else
var reflectance: vec3f=specularEnvironmentR0*environmentBrdf.x+specularEnvironmentR90*environmentBrdf.y;
#endif
return reflectance;}
fn getReflectanceFromBRDFLookup(specularEnvironmentR0: vec3f,environmentBrdf: vec3f)->vec3f {
#ifdef BRDF_V_HEIGHT_CORRELATED
var reflectance: vec3f=mix(environmentBrdf.xxx,environmentBrdf.yyy,specularEnvironmentR0);
#else
var reflectance: vec3f=specularEnvironmentR0*environmentBrdf.x+environmentBrdf.y;
#endif
return reflectance;}
#endif
/* NOT USED
#if defined(SHEEN) && defined(SHEEN_SOFTER)
fn getBRDFLookupCharlieSheen(NdotV: f32,perceptualRoughness: f32)->f32
{var c: f32=1.0-NdotV;var c3: f32=c*c*c;return 0.65584461*c3+1.0/(4.16526551+exp(-7.97291361*perceptualRoughness+6.33516894));}
#endif
*/
#if !defined(ENVIRONMENTBRDF) || defined(REFLECTIONMAP_SKYBOX) || defined(ALPHAFRESNEL)
fn getReflectanceFromAnalyticalBRDFLookup_Jones(VdotN: f32,reflectance0: vec3f,reflectance90: vec3f,smoothness: f32)->vec3f
{var weight: f32=mix(FRESNEL_MAXIMUM_ON_ROUGH,1.0,smoothness);return reflectance0+weight*(reflectance90-reflectance0)*pow5(saturate(1.0-VdotN));}
#endif
#if defined(SHEEN) && defined(ENVIRONMENTBRDF)
/**
* The sheen BRDF not containing F can be easily stored in the blue channel of the BRDF texture.
* The blue channel contains DCharlie*VAshikhmin*NdotL as a lokkup table
*/
fn getSheenReflectanceFromBRDFLookup(reflectance0: vec3f,environmentBrdf: vec3f)->vec3f {var sheenEnvironmentReflectance: vec3f=reflectance0*environmentBrdf.b;return sheenEnvironmentReflectance;}
#endif
fn fresnelSchlickGGXVec3(VdotH: f32,reflectance0: vec3f,reflectance90: vec3f)->vec3f
{return reflectance0+(reflectance90-reflectance0)*pow5(1.0-VdotH);}
fn fresnelSchlickGGX(VdotH: f32,reflectance0: f32,reflectance90: f32)->f32
{return reflectance0+(reflectance90-reflectance0)*pow5(1.0-VdotH);}
#ifdef CLEARCOAT
fn getR0RemappedForClearCoat(f0: vec3f)->vec3f {
#ifdef CLEARCOAT_DEFAULTIOR
#ifdef MOBILE
return saturateVec3(f0*(f0*0.526868+0.529324)-0.0482256);
#else
return saturateVec3(f0*(f0*(0.941892-0.263008*f0)+0.346479)-0.0285998);
#endif
#else
var s: vec3f=sqrt(f0);var t: vec3f=(uniforms.vClearCoatRefractionParams.z+uniforms.vClearCoatRefractionParams.w*s)/(uniforms.vClearCoatRefractionParams.w+uniforms.vClearCoatRefractionParams.z*s);return squareVec3(t);
#endif
}
#endif
#ifdef IRIDESCENCE
const XYZ_TO_REC709: mat3x3f= mat3x3f(
3.2404542,-0.9692660, 0.0556434,
-1.5371385, 1.8760108,-0.2040259,
-0.4985314, 0.0415560, 1.0572252
);fn getIORTfromAirToSurfaceR0(f0: vec3f)->vec3f {var sqrtF0: vec3f=sqrt(f0);return (1.+sqrtF0)/(1.-sqrtF0);}
fn getR0fromIORsVec3(iorT: vec3f,iorI: f32)->vec3f {return squareVec3((iorT- vec3f(iorI))/(iorT+ vec3f(iorI)));}
fn getR0fromIORs(iorT: f32,iorI: f32)->f32 {return square((iorT-iorI)/(iorT+iorI));}
fn evalSensitivity(opd: f32,shift: vec3f)->vec3f {var phase: f32=2.0*PI*opd*1.0e-9;const val: vec3f= vec3f(5.4856e-13,4.4201e-13,5.2481e-13);const pos: vec3f= vec3f(1.6810e+06,1.7953e+06,2.2084e+06);const vr: vec3f= vec3f(4.3278e+09,9.3046e+09,6.6121e+09);var xyz: vec3f=val*sqrt(2.0*PI*vr)*cos(pos*phase+shift)*exp(-square(phase)*vr);xyz.x+=9.7470e-14*sqrt(2.0*PI*4.5282e+09)*cos(2.2399e+06*phase+shift[0])*exp(-4.5282e+09*square(phase));xyz/=1.0685e-7;var srgb: vec3f=XYZ_TO_REC709*xyz;return srgb;}
fn evalIridescence(outsideIOR: f32,eta2: f32,cosTheta1: f32,thinFilmThickness: f32,baseF0: vec3f)->vec3f {var I: vec3f= vec3f(1.0);var iridescenceIOR: f32=mix(outsideIOR,eta2,smoothstep(0.0,0.03,thinFilmThickness));var sinTheta2Sq: f32=square(outsideIOR/iridescenceIOR)*(1.0-square(cosTheta1));var cosTheta2Sq: f32=1.0-sinTheta2Sq;if (cosTheta2Sq<0.0) {return I;}
var cosTheta2: f32=sqrt(cosTheta2Sq);var R0: f32=getR0fromIORs(iridescenceIOR,outsideIOR);var R12: f32=fresnelSchlickGGX(cosTheta1,R0,1.);var R21: f32=R12;var T121: f32=1.0-R12;var phi12: f32=0.0;if (iridescenceIOR<outsideIOR) {phi12=PI;}
var phi21: f32=PI-phi12;var baseIOR: vec3f=getIORTfromAirToSurfaceR0(clamp(baseF0,vec3f(0.0),vec3f(0.9999))); 
var R1: vec3f=getR0fromIORsVec3(baseIOR,iridescenceIOR);let maxR1: f32=max(R1.r,max(R1.g,R1.b));if (maxR1<1e-6) {return max(vec3f(R12),vec3f(0.0));}
var R23: vec3f=fresnelSchlickGGXVec3(cosTheta2,R1,vec3f(1.));var phi23: vec3f=vec3f(0.0);if (baseIOR[0]<iridescenceIOR) {phi23[0]=PI;}
if (baseIOR[1]<iridescenceIOR) {phi23[1]=PI;}
if (baseIOR[2]<iridescenceIOR) {phi23[2]=PI;}
var opd: f32=2.0*iridescenceIOR*thinFilmThickness*cosTheta2;var phi: vec3f=vec3f(phi21)+phi23;var R123: vec3f=clamp(R12*R23,vec3f(1e-5),vec3f(0.9999));var r123: vec3f=sqrt(R123);var Rs: vec3f=(T121*T121)*R23/(vec3f(1.0)-R123);var C0: vec3f=R12+Rs;I=C0;var Cm: vec3f=Rs-T121;for (var m: i32=1; m<=2; m++)
{Cm*=r123;var Sm: vec3f=2.0*evalSensitivity(f32(m)*opd,f32(m)*phi);I+=Cm*Sm;}
return max(I,vec3f(0.0));}
#endif
fn normalDistributionFunction_TrowbridgeReitzGGX(NdotH: f32,alphaG: f32)->f32
{var a2: f32=alphaG*alphaG;var d: f32=NdotH*NdotH*(a2-1.0)+1.0;return a2/(PI*d*d);}
#ifdef SHEEN
fn normalDistributionFunction_CharlieSheen(NdotH: f32,alphaG: f32)->f32
{var invR: f32=1./alphaG;var cos2h: f32=NdotH*NdotH;var sin2h: f32=1.-cos2h;return (2.+invR)*pow(sin2h,invR*.5)/(2.*PI);}
#endif
#ifdef ANISOTROPIC
fn normalDistributionFunction_BurleyGGX_Anisotropic(NdotH: f32,TdotH: f32,BdotH: f32,alphaTB: vec2f)->f32 {var a2: f32=alphaTB.x*alphaTB.y;var v: vec3f= vec3f(alphaTB.y*TdotH,alphaTB.x *BdotH,a2*NdotH);var v2: f32=dot(v,v);var w2: f32=a2/v2;return a2*w2*w2*RECIPROCAL_PI;}
#endif
#ifdef BRDF_V_HEIGHT_CORRELATED
fn smithVisibility_GGXCorrelated(NdotL: f32,NdotV: f32,alphaG: f32)->f32 {
#ifdef MOBILE
var GGXV: f32=NdotL*(NdotV*(1.0-alphaG)+alphaG);var GGXL: f32=NdotV*(NdotL*(1.0-alphaG)+alphaG);return 0.5/(GGXV+GGXL);
#else
var a2: f32=alphaG*alphaG;var GGXV: f32=NdotL*sqrt(NdotV*(NdotV-a2*NdotV)+a2);var GGXL: f32=NdotV*sqrt(NdotL*(NdotL-a2*NdotL)+a2);return 0.5/(GGXV+GGXL);
#endif
}
#else
fn smithVisibilityG1_TrowbridgeReitzGGXFast(dot: f32,alphaG: f32)->f32
{
#ifdef MOBILE
return 1.0/(dot+alphaG+(1.0-alphaG)*dot ));
#else
var alphaSquared: f32=alphaG*alphaG;return 1.0/(dot+sqrt(alphaSquared+(1.0-alphaSquared)*dot*dot));
#endif
}
fn smithVisibility_TrowbridgeReitzGGXFast(NdotL: f32,NdotV: f32,alphaG: f32)->f32
{var visibility: f32=smithVisibilityG1_TrowbridgeReitzGGXFast(NdotL,alphaG)*smithVisibilityG1_TrowbridgeReitzGGXFast(NdotV,alphaG);return visibility;}
#endif
#ifdef ANISOTROPIC
fn smithVisibility_GGXCorrelated_Anisotropic(NdotL: f32,NdotV: f32,TdotV: f32,BdotV: f32,TdotL: f32,BdotL: f32,alphaTB: vec2f)->f32 {var lambdaV: f32=NdotL*length( vec3f(alphaTB.x*TdotV,alphaTB.y*BdotV,NdotV));var lambdaL: f32=NdotV*length( vec3f(alphaTB.x*TdotL,alphaTB.y*BdotL,NdotL));var v: f32=0.5/(lambdaV+lambdaL);return v;}
#endif
#ifdef CLEARCOAT
fn visibility_Kelemen(VdotH: f32)->f32 {return 0.25/(VdotH*VdotH); }
#endif
#ifdef SHEEN
fn visibility_Ashikhmin(NdotL: f32,NdotV: f32)->f32
{return 1./(4.*(NdotL+NdotV-NdotL*NdotV));}
/* NOT USED
#ifdef SHEEN_SOFTER
fn l(x: f32,alphaG: f32)->f32
{var oneMinusAlphaSq: f32=(1.0-alphaG)*(1.0-alphaG);var a: f32=mix(21.5473,25.3245,oneMinusAlphaSq);var b: f32=mix(3.82987,3.32435,oneMinusAlphaSq);var c: f32=mix(0.19823,0.16801,oneMinusAlphaSq);var d: f32=mix(-1.97760,-1.27393,oneMinusAlphaSq);var e: f32=mix(-4.32054,-4.85967,oneMinusAlphaSq);return a/(1.0+b*pow(x,c))+d*x+e;}
fn lambdaSheen(cosTheta: f32,alphaG: f32)->f32
{return abs(cosTheta)<0.5 ? exp(l(cosTheta,alphaG)) : exp(2.0*l(0.5,alphaG)-l(1.0-cosTheta,alphaG));}
fn visibility_CharlieSheen(NdotL: f32,NdotV: f32,alphaG: f32)->f32
{var G: f32=1.0/(1.0+lambdaSheen(NdotV,alphaG)+lambdaSheen(NdotL,alphaG));return G/(4.0*NdotV*NdotL);}
#endif
*/
#endif
const constant1_FON: f32=0.5f-2.0f/(3.0f*PI);const constant2_FON: f32=2.0f/3.0f-28.0f/(15.0f*PI);fn E_FON_approx(mu: f32,roughness: f32)->f32
{var sigma: f32=roughness; 
var mucomp: f32=1.0f-mu;var mucomp2: f32=mucomp*mucomp;const Gcoeffs: mat2x2f=mat2x2f(0.0571085289f,-0.332181442f,
0.491881867f,0.0714429953f);var GoverPi: f32=dot(Gcoeffs*vec2f(mucomp,mucomp2),vec2f(1.0f,mucomp2));return (1.0f+sigma*GoverPi)/(1.0f+constant1_FON*sigma);}
fn diffuseBRDF_EON(albedo: vec3f,roughness: f32,NdotL: f32,NdotV: f32,LdotV: f32)->vec3f
{var rho: vec3f=albedo;var sigma: f32=roughness; 
var mu_i: f32=NdotL; 
var mu_o: f32=NdotV; 
var s: f32=LdotV-mu_i*mu_o; 
var sovertF: f32=select(s,s/max(mu_i,mu_o),s>0.0f); 
var AF: f32=1.0f/(1.0f+constant1_FON*sigma); 
var f_ss: vec3f=(rho*RECIPROCAL_PI)*AF*(1.0f+sigma*sovertF); 
var EFo: f32=E_FON_approx(mu_o,sigma); 
var EFi: f32=E_FON_approx(mu_i,sigma); 
var avgEF: f32=AF*(1.0f+constant2_FON*sigma); 
var rho_ms: vec3f=(rho*rho)*avgEF/(vec3f(1.0f)-rho*(1.0f-avgEF));const eps: f32=1.0e-7f;var f_ms: vec3f=(rho_ms*RECIPROCAL_PI)*max(eps,1.0f-EFo) 
* max(eps,1.0f-EFi)
/ max(eps,1.0f-avgEF);return (f_ss+f_ms);}
fn diffuseBRDF_Burley(NdotL: f32,NdotV: f32,VdotH: f32,roughness: f32)->f32 {var diffuseFresnelNV: f32=pow5(saturateEps(1.0-NdotL));var diffuseFresnelNL: f32=pow5(saturateEps(1.0-NdotV));var diffuseFresnel90: f32=0.5+2.0*VdotH*VdotH*roughness;var fresnel: f32 =
(1.0+(diffuseFresnel90-1.0)*diffuseFresnelNL) *
(1.0+(diffuseFresnel90-1.0)*diffuseFresnelNV);return fresnel/PI;}
#ifdef SS_TRANSLUCENCY
fn transmittanceBRDF_Burley(tintColor: vec3f,diffusionDistance: vec3f,thickness: f32)->vec3f {var S: vec3f=1./maxEpsVec3(diffusionDistance);var temp: vec3f=exp((-0.333333333*thickness)*S);return tintColor.rgb*0.25*(temp*temp*temp+3.0*temp);}
fn computeWrappedDiffuseNdotL(NdotL: f32,w: f32)->f32 {var t: f32=1.0+w;var invt2: f32=1.0/(t*t);return saturate((NdotL+w)*invt2);}
#endif
#endif 
`;r.f.IncludesShadersStoreWGSL[f]||(r.f.IncludesShadersStoreWGSL[f]=i),e.s(["f",0,{name:f,shader:i}])},33781,90617,2241,11623,21743,26857,36730,66364,90068,40951,72596,88558,91032,e=>{"use strict";var r=e.i(47662);e.i(72033);let f="pbrFragmentExtraDeclaration",i=`varying vPositionW: vec3f;
#if DEBUGMODE>0
varying vClipSpacePosition: vec4f;
#endif
#include<mainUVVaryingDeclaration>[1..7]
#ifdef NORMAL
varying vNormalW: vec3f;
#if defined(USESPHERICALFROMREFLECTIONMAP) && defined(USESPHERICALINVERTEX)
varying vEnvironmentIrradiance: vec3f;
#endif
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vColor: vec4f;
#endif
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying vViewDepth: f32;
#endif
`;r.f.IncludesShadersStoreWGSL[f]||(r.f.IncludesShadersStoreWGSL[f]=i),e.s(["f",0,{name:f,shader:i}],33781);let n="subSurfaceScatteringFunctions",t=`fn testLightingForSSS(diffusionProfile: f32)->bool
{return diffusionProfile<1.;}`;r.f.IncludesShadersStoreWGSL[n]||(r.f.IncludesShadersStoreWGSL[n]=t),e.s(["f",0,{name:n,shader:t}],90617);let o="importanceSampling",a=`fn hemisphereCosSample(u: vec2f)->vec3f {var phi: f32=2.*PI*u.x;var cosTheta2: f32=1.-u.y;var cosTheta: f32=sqrt(cosTheta2);var sinTheta: f32=sqrt(1.-cosTheta2);return vec3f(sinTheta*cos(phi),sinTheta*sin(phi),cosTheta);}
fn hemisphereImportanceSampleDggx(u: vec2f,a: f32)->vec3f {var phi: f32=2.*PI*u.x;var cosTheta2: f32=(1.-u.y)/(1.+(a+1.)*((a-1.)*u.y));var cosTheta: f32=sqrt(cosTheta2);var sinTheta: f32=sqrt(1.-cosTheta2);return vec3f(sinTheta*cos(phi),sinTheta*sin(phi),cosTheta);}
fn hemisphereImportanceSampleDggxAnisotropic(Xi: vec2f,alphaTangent: f32,alphaBitangent: f32)->vec3f
{let alphaT: f32=max(alphaTangent,0.0001);let alphaB: f32=max(alphaBitangent,0.0001);var phi: f32=atan(alphaB/alphaT*tan(2.0f*PI*Xi.x));if (Xi.x>0.5) {phi+=PI; }
let cosPhi: f32=cos(phi);let sinPhi: f32=sin(phi);let alpha2: f32=(cosPhi*cosPhi)/(alphaT*alphaT) +
(sinPhi*sinPhi)/(alphaB*alphaB);let tanTheta2: f32=Xi.y/(1.0f-Xi.y)/alpha2;let cosTheta: f32=1.0f/sqrt(1.0f+tanTheta2);let sinTheta: f32=sqrt(max(0.0f,1.0f-cosTheta*cosTheta));return vec3f(sinTheta*cosPhi,sinTheta*sinPhi,cosTheta);}
fn hemisphereImportanceSampleDCharlie(u: vec2f,a: f32)->vec3f { 
var phi: f32=2.*PI*u.x;var sinTheta: f32=pow(u.y,a/(2.*a+1.));var cosTheta: f32=sqrt(1.-sinTheta*sinTheta);return vec3f(sinTheta*cos(phi),sinTheta*sin(phi),cosTheta);}`;r.f.IncludesShadersStoreWGSL[o]||(r.f.IncludesShadersStoreWGSL[o]=a),e.s(["f",0,{name:o,shader:a}],2241);let c="pbrHelperFunctions",s=`#define MINIMUMVARIANCE 0.0005
#ifndef TEXRD_DEFINED
fn TEXRD(t: texture_2d<f32>,ts: sampler,uv: vec2f)->vec4f {return textureSample(t,ts,uv);}
#define TEXRD_DEFINED
#endif
fn convertRoughnessToAverageSlope(roughness: f32)->f32
{return roughness*roughness+MINIMUMVARIANCE;}
fn fresnelGrazingReflectance(reflectance0: f32)->f32 {var reflectance90: f32=saturate(reflectance0*25.0);return reflectance90;}
fn getAARoughnessFactors(normalVector: vec3f)->vec2f {
#ifdef SPECULARAA
var nDfdx: vec3f=dpdx(normalVector.xyz);var nDfdy: vec3f=dpdy(normalVector.xyz);var slopeSquare: f32=max(dot(nDfdx,nDfdx),dot(nDfdy,nDfdy));var geometricRoughnessFactor: f32=pow(saturate(slopeSquare),0.333);var geometricAlphaGFactor: f32=sqrt(slopeSquare);geometricAlphaGFactor*=0.75;return vec2f(geometricRoughnessFactor,geometricAlphaGFactor);
#else
return vec2f(0.);
#endif
}
#ifdef ANISOTROPIC
#ifdef ANISOTROPIC_LEGACY
fn getAnisotropicRoughness(alphaG: f32,anisotropy: f32)->vec2f {var alphaT: f32=max(alphaG*(1.0+anisotropy),MINIMUMVARIANCE);var alphaB: f32=max(alphaG*(1.0-anisotropy),MINIMUMVARIANCE);return vec2f(alphaT,alphaB);}
fn getAnisotropicBentNormals(T: vec3f,B: vec3f,N: vec3f,V: vec3f,anisotropy: f32,roughness: f32)->vec3f {var anisotropicFrameDirection: vec3f=select(T,B,anisotropy>=0.0);var anisotropicFrameTangent: vec3f=cross(normalize(anisotropicFrameDirection),V);var anisotropicFrameNormal: vec3f=cross(anisotropicFrameTangent,anisotropicFrameDirection);var anisotropicNormal: vec3f=normalize(mix(N,anisotropicFrameNormal,abs(anisotropy)));return anisotropicNormal;}
#elif ANISOTROPIC_OPENPBR
fn getAnisotropicRoughness(alphaG: f32,anisotropy: f32)->vec2f {var alphaT: f32=max(alphaG*alphaG*sqrt(2.0/(1.0+(1.0-anisotropy)*(1.0-anisotropy))),MINIMUMVARIANCE);var alphaB: f32=max(alphaT*(1.0-anisotropy),MINIMUMVARIANCE);return vec2f(alphaT,alphaB);}
#else
fn getAnisotropicRoughness(alphaG: f32,anisotropy: f32)->vec2f {var alphaT: f32=max(mix(alphaG,1.0,anisotropy*anisotropy),MINIMUMVARIANCE);var alphaB: f32=max(alphaG,MINIMUMVARIANCE);return vec2f(alphaT,alphaB);}
fn getAnisotropicBentNormals(T: vec3f,B: vec3f,N: vec3f,V: vec3f,anisotropy: f32,roughness: f32)->vec3f {var bentNormal: vec3f=cross(B,V);bentNormal=normalize(cross(bentNormal,B));var sq=1.0-anisotropy*(1.0-roughness);var a: f32=sq*sq*sq*sq;bentNormal=normalize(mix(bentNormal,N,a));return bentNormal;}
#endif
#endif
#if defined(CLEARCOAT) || defined(SS_REFRACTION)
fn cocaLambertVec3(alpha: vec3f,distance: f32)->vec3f {return exp(-alpha*distance);}
fn cocaLambert(NdotVRefract: f32,NdotLRefract: f32,alpha: vec3f,thickness: f32)->vec3f {return cocaLambertVec3(alpha,(thickness*((NdotLRefract+NdotVRefract)/(NdotLRefract*NdotVRefract))));}
fn computeColorAtDistanceInMedia(color: vec3f,distance: f32)->vec3f {return -log(color)/distance;}
fn computeClearCoatAbsorption(NdotVRefract: f32,NdotLRefract: f32,clearCoatColor: vec3f,clearCoatThickness: f32,clearCoatIntensity: f32)->vec3f {var clearCoatAbsorption: vec3f=mix( vec3f(1.0),
cocaLambert(NdotVRefract,NdotLRefract,clearCoatColor,clearCoatThickness),
clearCoatIntensity);return clearCoatAbsorption;}
#endif
#ifdef MICROSURFACEAUTOMATIC
fn computeDefaultMicroSurface(microSurface: f32,reflectivityColor: vec3f)->f32
{const kReflectivityNoAlphaWorkflow_SmoothnessMax: f32=0.95;var reflectivityLuminance: f32=getLuminance(reflectivityColor);var reflectivityLuma: f32=sqrt(reflectivityLuminance);var resultMicroSurface=reflectivityLuma*kReflectivityNoAlphaWorkflow_SmoothnessMax;return resultMicroSurface;}
#endif
`;r.f.IncludesShadersStoreWGSL[c]||(r.f.IncludesShadersStoreWGSL[c]=s),e.s(["f",0,{name:c,shader:s}],11623),e.i(97412);let l="pbrDirectLightingSetupFunctions",d=`struct preLightingInfo
{lightOffset: vec3f,
lightDistanceSquared: f32,
lightDistance: f32,
attenuation: f32,
L: vec3f,
H: vec3f,
NdotV: f32,
NdotLUnclamped: f32,
NdotL: f32,
VdotH: f32,
LdotV: f32,
roughness: f32,
diffuseRoughness: f32,
surfaceAlbedo: vec3f,
#ifdef IRIDESCENCE
iridescenceIntensity: f32
#endif
#if defined(AREALIGHTUSED) && defined(AREALIGHTSUPPORTED)
areaLightDiffuse: vec3f,
#ifdef SPECULARTERM
areaLightSpecular: vec3f,
areaLightFresnel: vec4f
#endif
#endif
};fn computePointAndSpotPreLightingInfo(lightData: vec4f,V: vec3f,N: vec3f,posW: vec3f)->preLightingInfo {var result: preLightingInfo;result.lightOffset=lightData.xyz-posW;result.lightDistanceSquared=dot(result.lightOffset,result.lightOffset);result.lightDistance=sqrt(result.lightDistanceSquared);result.L=normalize(result.lightOffset);result.H=normalize(V+result.L);result.VdotH=saturate(dot(V,result.H));result.NdotLUnclamped=dot(N,result.L);result.NdotL=saturateEps(result.NdotLUnclamped);return result;}
fn computeDirectionalPreLightingInfo(lightData: vec4f,V: vec3f,N: vec3f)->preLightingInfo {var result: preLightingInfo;result.lightDistance=length(-lightData.xyz);result.L=normalize(-lightData.xyz);result.H=normalize(V+result.L);result.VdotH=saturate(dot(V,result.H));result.NdotLUnclamped=dot(N,result.L);result.NdotL=saturateEps(result.NdotLUnclamped);result.LdotV=dot(result.L,V);return result;}
fn computeHemisphericPreLightingInfo(lightData: vec4f,V: vec3f,N: vec3f)->preLightingInfo {var result: preLightingInfo;result.NdotL=dot(N,lightData.xyz)*0.5+0.5;result.NdotL=saturateEps(result.NdotL);result.NdotLUnclamped=result.NdotL;
#ifdef SPECULARTERM
result.L=normalize(lightData.xyz);result.H=normalize(V+result.L);result.VdotH=saturate(dot(V,result.H));
#endif
return result;}
#if defined(AREALIGHTUSED) && defined(AREALIGHTSUPPORTED)
#include<ltcHelperFunctions>
var areaLightsLTC1SamplerSampler: sampler;var areaLightsLTC1Sampler: texture_2d<f32>;var areaLightsLTC2SamplerSampler: sampler;var areaLightsLTC2Sampler: texture_2d<f32>;fn computeAreaPreLightingInfo(ltc1: texture_2d<f32>,ltc1Sampler:sampler,ltc2:texture_2d<f32>,ltc2Sampler:sampler,viewDirectionW: vec3f,vNormal:vec3f,vPosition:vec3f,lightCenter:vec3f,halfWidth:vec3f, halfHeight:vec3f,roughness:f32)->preLightingInfo {var result: preLightingInfo;var data: areaLightData=computeAreaLightSpecularDiffuseFresnel(ltc1,ltc1Sampler,ltc2,ltc2Sampler,viewDirectionW,vNormal,vPosition,lightCenter,halfWidth,halfHeight,roughness);
#ifdef SPECULARTERM
result.areaLightFresnel=data.Fresnel;result.areaLightSpecular=data.Specular;
#endif
result.areaLightDiffuse+=data.Diffuse;return result;}
fn computeAreaPreLightingInfoWithTexture(ltc1: texture_2d<f32>,ltc1Sampler:sampler,ltc2:texture_2d<f32>,ltc2Sampler:sampler,emissionTexture:texture_2d<f32>,emissionTextureSampler:sampler,viewDirectionW: vec3f,vNormal:vec3f,vPosition:vec3f,lightCenter:vec3f,halfWidth:vec3f, halfHeight:vec3f,roughness:f32)->preLightingInfo {var result: preLightingInfo;result.lightOffset=lightCenter-vPosition;result.lightDistanceSquared=dot(result.lightOffset,result.lightOffset);result.lightDistance=sqrt(result.lightDistanceSquared);var data: areaLightData=computeAreaLightSpecularDiffuseFresnelWithEmission(ltc1,ltc1Sampler,ltc2,ltc2Sampler,emissionTexture,emissionTextureSampler,viewDirectionW,vNormal,vPosition,lightCenter,halfWidth,halfHeight,roughness);
#ifdef SPECULARTERM
result.areaLightFresnel=data.Fresnel;result.areaLightSpecular=data.Specular;
#endif
result.areaLightDiffuse=data.Diffuse;result.LdotV=0.;result.roughness=0.;result.diffuseRoughness=0.;result.surfaceAlbedo=vec3f(0.);return result;}
#endif
`;r.f.IncludesShadersStoreWGSL[l]||(r.f.IncludesShadersStoreWGSL[l]=d),e.s(["f",0,{name:l,shader:d}],21743);let v="pbrDirectLightingFalloffFunctions",u=`fn computeDistanceLightFalloff_Standard(lightOffset: vec3f,range: f32)->f32
{return max(0.,1.0-length(lightOffset)/range);}
fn computeDistanceLightFalloff_Physical(lightDistanceSquared: f32)->f32
{return 1.0/maxEps(lightDistanceSquared);}
fn computeDistanceLightFalloff_GLTF(lightDistanceSquared: f32,inverseSquaredRange: f32)->f32
{var lightDistanceFalloff: f32=1.0/maxEps(lightDistanceSquared);var factor: f32=lightDistanceSquared*inverseSquaredRange;var attenuation: f32=saturate(1.0-factor*factor);attenuation*=attenuation;lightDistanceFalloff*=attenuation;return lightDistanceFalloff;}
fn computeDirectionalLightFalloff_IES(lightDirection: vec3f,directionToLightCenterW: vec3f,iesLightTexture: texture_2d<f32>,iesLightTextureSampler: sampler)->f32
{var cosAngle: f32=dot(-lightDirection,directionToLightCenterW);var angle=acos(cosAngle)/PI;return textureSampleLevel(iesLightTexture,iesLightTextureSampler,vec2f(angle,0),0.).r;}
fn computeDistanceLightFalloff(lightOffset: vec3f,lightDistanceSquared: f32,range: f32,inverseSquaredRange: f32)->f32
{
#ifdef USEPHYSICALLIGHTFALLOFF
return computeDistanceLightFalloff_Physical(lightDistanceSquared);
#elif defined(USEGLTFLIGHTFALLOFF)
return computeDistanceLightFalloff_GLTF(lightDistanceSquared,inverseSquaredRange);
#else
return computeDistanceLightFalloff_Standard(lightOffset,range);
#endif
}
fn computeDirectionalLightFalloff_Standard(lightDirection: vec3f,directionToLightCenterW: vec3f,cosHalfAngle: f32,exponent: f32)->f32
{var falloff: f32=0.0;var cosAngle: f32=maxEps(dot(-lightDirection,directionToLightCenterW));if (cosAngle>=cosHalfAngle)
{falloff=max(0.,pow(cosAngle,exponent));}
return falloff;}
fn computeDirectionalLightFalloff_Physical(lightDirection: vec3f,directionToLightCenterW: vec3f,cosHalfAngle: f32)->f32
{const kMinusLog2ConeAngleIntensityRatio: f32=6.64385618977; 
var concentrationKappa: f32=kMinusLog2ConeAngleIntensityRatio/(1.0-cosHalfAngle);var lightDirectionSpreadSG: vec4f= vec4f(-lightDirection*concentrationKappa,-concentrationKappa);var falloff: f32=exp2(dot( vec4f(directionToLightCenterW,1.0),lightDirectionSpreadSG));return falloff;}
fn computeDirectionalLightFalloff_GLTF(lightDirection: vec3f,directionToLightCenterW: vec3f,lightAngleScale: f32,lightAngleOffset: f32)->f32
{var cd: f32=dot(-lightDirection,directionToLightCenterW);var falloff: f32=saturate(cd*lightAngleScale+lightAngleOffset);falloff*=falloff;return falloff;}
fn computeDirectionalLightFalloff(lightDirection: vec3f,directionToLightCenterW: vec3f,cosHalfAngle: f32,exponent: f32,lightAngleScale: f32,lightAngleOffset: f32)->f32
{
#ifdef USEPHYSICALLIGHTFALLOFF
return computeDirectionalLightFalloff_Physical(lightDirection,directionToLightCenterW,cosHalfAngle);
#elif defined(USEGLTFLIGHTFALLOFF)
return computeDirectionalLightFalloff_GLTF(lightDirection,directionToLightCenterW,lightAngleScale,lightAngleOffset);
#else
return computeDirectionalLightFalloff_Standard(lightDirection,directionToLightCenterW,cosHalfAngle,exponent);
#endif
}`;r.f.IncludesShadersStoreWGSL[v]||(r.f.IncludesShadersStoreWGSL[v]=u),e.s(["f",0,{name:v,shader:u}],26857);let m="hdrFilteringFunctions",p=`#ifdef NUM_SAMPLES
#if NUM_SAMPLES>0
fn radicalInverse_VdC(value: u32)->f32 
{var bits=(value<<16u) | (value>>16u);bits=((bits & 0x55555555u)<<1u) | ((bits & 0xAAAAAAAAu)>>1u);bits=((bits & 0x33333333u)<<2u) | ((bits & 0xCCCCCCCCu)>>2u);bits=((bits & 0x0F0F0F0Fu)<<4u) | ((bits & 0xF0F0F0F0u)>>4u);bits=((bits & 0x00FF00FFu)<<8u) | ((bits & 0xFF00FF00u)>>8u);return f32(bits)*2.3283064365386963e-10; }
fn hammersley(i: u32,N: u32)->vec2f
{return vec2f( f32(i)/ f32(N),radicalInverse_VdC(i));}
fn log4(x: f32)->f32 {return log2(x)/2.;}
fn uv_to_normal(uv: vec2f)->vec3f {var N: vec3f;var uvRange: vec2f=uv;var theta: f32=uvRange.x*2.0*PI;var phi: f32=uvRange.y*PI;N.x=cos(theta)*sin(phi);N.z=sin(theta)*sin(phi);N.y=cos(phi);return N;}
const NUM_SAMPLES_FLOAT: f32= f32(NUM_SAMPLES);const NUM_SAMPLES_FLOAT_INVERSED: f32=1./NUM_SAMPLES_FLOAT;const K: f32=4.;fn irradiance(
#ifdef CUSTOM_IRRADIANCE_FILTERING_INPUT
CUSTOM_IRRADIANCE_FILTERING_INPUT
#else
inputTexture: texture_cube<f32>,inputSampler: sampler,
#endif
inputN: vec3f,
filteringInfo: vec2f,
diffuseRoughness: f32,
surfaceAlbedo: vec3f,
inputV: vec3f
#ifdef IBL_CDF_FILTERING
,icdfSampler: texture_2d<f32>,icdfSamplerSampler: sampler
#endif
)->vec3f
{var n: vec3f=normalize(inputN);var result: vec3f= vec3f(0.0);
#ifndef IBL_CDF_FILTERING
var tangent: vec3f=select(vec3f(1.,0.,0.),vec3f(0.,0.,1.),abs(n.z)<0.999);tangent=normalize(cross(tangent,n));var bitangent: vec3f=cross(n,tangent);var tbn: mat3x3f= mat3x3f(tangent,bitangent,n);var tbnInverse: mat3x3f=transpose(tbn);
#endif
var maxLevel: f32=filteringInfo.y;var dim0: f32=filteringInfo.x;var omegaP: f32=(4.*PI)/(6.*dim0*dim0);var clampedAlbedo: vec3f=clamp(surfaceAlbedo,vec3f(0.1),vec3f(1.0));for(var i: u32=0u; i<NUM_SAMPLES; i++)
{var Xi: vec2f=hammersley(i,NUM_SAMPLES);
#ifdef IBL_CDF_FILTERING
var T: vec2f;T.x=textureSampleLevel(icdfSampler,icdfSamplerSampler,vec2(Xi.x,0.0),0.0).x;T.y=textureSampleLevel(icdfSampler,icdfSamplerSampler,vec2(T.x,Xi.y),0.0).y;var Ls: vec3f=uv_to_normal(vec2f(1.0-fract(T.x+0.25),T.y));var NoL: f32=dot(n,Ls);var NoV: f32=dot(n,inputV);
#if BASE_DIFFUSE_MODEL==BRDF_DIFFUSE_MODEL_EON
var LoV: f32=dot(Ls,inputV);
#elif BASE_DIFFUSE_MODEL==BRDF_DIFFUSE_MODEL_BURLEY
var H: vec3f=(inputV+Ls)*0.5;var VoH: f32=dot(inputV,H);
#endif 
#else
var Ls: vec3f=hemisphereCosSample(Xi);Ls=normalize(Ls);var Ns: vec3f= vec3f(0.,0.,1.);var NoL: f32=dot(Ns,Ls);var V: vec3f=tbnInverse*inputV;var NoV: f32=dot(Ns,V);
#if BASE_DIFFUSE_MODEL==BRDF_DIFFUSE_MODEL_EON
var LoV: f32=dot(Ls,V);
#elif BASE_DIFFUSE_MODEL==BRDF_DIFFUSE_MODEL_BURLEY
var H: vec3f=(V+Ls)*0.5;var VoH: f32=dot(V,H);
#endif
#endif
if (NoL>0.) {
#ifdef IBL_CDF_FILTERING
var pdf: f32=textureSampleLevel(icdfSampler,icdfSamplerSampler,T,0.0).z;var c: vec3f=textureSampleLevel(inputTexture,inputSampler,Ls,0.0).rgb;
#else
var pdf_inversed: f32=PI/NoL;var omegaS: f32=NUM_SAMPLES_FLOAT_INVERSED*pdf_inversed;var l: f32=log4(omegaS)-log4(omegaP)+log4(K);var mipLevel: f32=clamp(l,0.0,maxLevel);
#ifdef CUSTOM_IRRADIANCE_FILTERING_FUNCTION
CUSTOM_IRRADIANCE_FILTERING_FUNCTION
#else
var c: vec3f=textureSampleLevel(inputTexture,inputSampler,tbn*Ls,mipLevel).rgb;
#endif
#endif
#ifdef GAMMA_INPUT
c=toLinearSpaceVec3(c);
#endif
var diffuseRoughnessTerm: vec3f=vec3f(1.0);
#if BASE_DIFFUSE_MODEL==BRDF_DIFFUSE_MODEL_EON
diffuseRoughnessTerm=diffuseBRDF_EON(clampedAlbedo,diffuseRoughness,NoL,NoV,LoV)*PI;
#elif BASE_DIFFUSE_MODEL==BRDF_DIFFUSE_MODEL_BURLEY
diffuseRoughnessTerm=vec3f(diffuseBRDF_Burley(NoL,NoV,VoH,diffuseRoughness)*PI);
#endif
#ifdef IBL_CDF_FILTERING
var light: vec3f=vec3f(0.0);if (pdf>1e-6) {light=vec3f(1.0)/vec3f(pdf)*c;}
result+=NoL*diffuseRoughnessTerm*light;
#else
result+=c*diffuseRoughnessTerm;
#endif
}}
result=result*NUM_SAMPLES_FLOAT_INVERSED;
#if BASE_DIFFUSE_MODEL==BRDF_DIFFUSE_MODEL_EON
result=result/clampedAlbedo;
#endif
return result;}
fn radiance(alphaG: f32,inputTexture: texture_cube<f32>,inputSampler: sampler,inputN: vec3f,filteringInfo: vec2f)->vec3f
{var n: vec3f=normalize(inputN);var c: vec3f=textureSampleLevel(inputTexture,inputSampler,n,0.0).rgb; 
if (alphaG==0.) {
#ifdef GAMMA_INPUT
c=toLinearSpaceVec3(c);
#endif
return c;} else {var result: vec3f= vec3f(0.);var tangent: vec3f=select(vec3f(1.,0.,0.),vec3f(0.,0.,1.),abs(n.z)<0.999);tangent=normalize(cross(tangent,n));var bitangent: vec3f=cross(n,tangent);var tbn: mat3x3f= mat3x3f(tangent,bitangent,n);var maxLevel: f32=filteringInfo.y;var dim0: f32=filteringInfo.x;var omegaP: f32=(4.*PI)/(6.*dim0*dim0);var weight: f32=0.;for(var i: u32=0u; i<NUM_SAMPLES; i++)
{var Xi: vec2f=hammersley(i,NUM_SAMPLES);var H: vec3f=hemisphereImportanceSampleDggx(Xi,alphaG);var NoV: f32=1.;var NoH: f32=H.z;var NoH2: f32=H.z*H.z;var NoL: f32=2.*NoH2-1.;var L: vec3f= vec3f(2.*NoH*H.x,2.*NoH*H.y,NoL);L=normalize(L);if (NoL>0.) {var pdf_inversed: f32=4./normalDistributionFunction_TrowbridgeReitzGGX(NoH,alphaG);var omegaS: f32=NUM_SAMPLES_FLOAT_INVERSED*pdf_inversed;var l: f32=log4(omegaS)-log4(omegaP)+log4(K);var mipLevel: f32=clamp( f32(l),0.0,maxLevel);weight+=NoL;var c: vec3f=textureSampleLevel(inputTexture,inputSampler,tbn*L,mipLevel).rgb;
#ifdef GAMMA_INPUT
c=toLinearSpaceVec3(c);
#endif
result+=c*NoL;}}
result=result/weight;return result;}}
#ifdef ANISOTROPIC
fn radianceAnisotropic(
alphaTangent: f32, 
alphaBitangent: f32, 
inputTexture: texture_cube<f32>,
inputSampler: sampler,
inputView: vec3f, 
inputTangent: vec3f, 
inputBitangent: vec3f, 
inputNormal: vec3f, 
filteringInfo: vec2f,
noiseInput: vec2f, 
isRefraction: bool,
ior: f32 
)->vec3f {var V: vec3f=inputView;var N: vec3f=inputNormal;var T: vec3f=inputTangent;var B: vec3f=inputBitangent;var result: vec3f=vec3f(0.f);var maxLevel: f32=filteringInfo.y;var dim0: f32=filteringInfo.x;let clampedAlphaT: f32=max(alphaTangent,MINIMUMVARIANCE);let clampedAlphaB: f32=max(alphaBitangent,MINIMUMVARIANCE);var effectiveDim: f32=dim0*sqrt(clampedAlphaT*clampedAlphaB);var omegaP: f32=(4.f*PI)/(6.f*effectiveDim*effectiveDim);let noiseScale: f32=clamp(log2(f32(NUM_SAMPLES))/12.0f,0.0f,1.0f);var weight: f32=0.f;for(var i: u32=0u; i<NUM_SAMPLES; i++)
{var Xi: vec2f=hammersley(i,NUM_SAMPLES);Xi=fract(Xi+noiseInput*mix(0.5f,0.015f,noiseScale)); 
var H_tangent: vec3f=hemisphereImportanceSampleDggxAnisotropic(Xi,clampedAlphaT,clampedAlphaB);var H: vec3f=normalize(H_tangent.x*T+H_tangent.y*B+H_tangent.z*N);var L: vec3f;if (isRefraction) {L=refract(-V,H,1.0/ior);} else {L=reflect(-V,H);}
var NoH: f32=max(dot(N,H),0.001f);var VoH: f32=max(dot(V,H),0.001f);var NoL: f32=max(dot(N,L),0.001f);if (NoL>0.f) {var pdf_inversed: f32=4./normalDistributionFunction_BurleyGGX_Anisotropic(
H_tangent.z,H_tangent.x,H_tangent.y,vec2f(clampedAlphaT,clampedAlphaB)
);var omegaS: f32=NUM_SAMPLES_FLOAT_INVERSED*pdf_inversed;var l: f32=log4(omegaS)-log4(omegaP)+log4(K);var mipLevel: f32=clamp(l,0.0f,maxLevel);weight+=NoL;var c: vec3f=textureSampleLevel(inputTexture,inputSampler,L,mipLevel).rgb;
#if GAMMA_INPUT
c=toLinearSpaceVec3(c);
#endif
result+=c*NoL;}}
result=result/weight;return result;}
#endif
#endif
#endif
`;r.f.IncludesShadersStoreWGSL[m]||(r.f.IncludesShadersStoreWGSL[m]=p),e.s(["f",0,{name:m,shader:p}],36730);let E="pbrBlockReflectance0",h=`var reflectanceF0: f32=reflectivityOut.reflectanceF0;var specularEnvironmentR0: vec3f=reflectivityOut.colorReflectanceF0;var specularEnvironmentR90: vec3f= reflectivityOut.reflectanceF90;
#ifdef ALPHAFRESNEL
var reflectance90: f32=fresnelGrazingReflectance(reflectanceF0);specularEnvironmentR90=specularEnvironmentR90*reflectance90;
#endif
`;r.f.IncludesShadersStoreWGSL[E]||(r.f.IncludesShadersStoreWGSL[E]=h),e.s(["f",0,{name:E,shader:h}],66364);let S="pbrClusteredLightingFunctions",g=`#if defined(CLUSTLIGHT{X}) && defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
fn computeClusteredLighting{X}(
lightDataTexture: texture_2d<f32>,
lightData: vec4f,
sliceRange: vec2u,
V: vec3f,
N: vec3f,
posW: vec3f,
surfaceAlbedo: vec3f,
reflectivityOut: reflectivityOutParams,
#ifdef IRIDESCENCE
iridescenceIntensity: f32,
#endif
#ifdef SS_TRANSLUCENCY
subSurfaceOut: subSurfaceOutParams,
#endif
#ifdef SPECULARTERM
AARoughnessFactor: f32,
#endif
#ifdef ANISOTROPIC
anisotropicOut: anisotropicOutParams,
#endif
#ifdef SHEEN
sheenOut: sheenOutParams,
#endif
#ifdef CLEARCOAT
clearcoatOut: clearcoatOutParams,
#endif
)->lightingInfo {let NdotV=absEps(dot(N,V));
#include<pbrBlockReflectance0>
#ifdef CLEARCOAT
specularEnvironmentR0=clearcoatOut.specularEnvironmentR0;
#endif
var result: lightingInfo;let tilePosition=vec2u(fragmentInputs.position.xy*lightData.xy);let maskResolution=vec2u(lightData.zw);var tileIndex=(tilePosition.x*maskResolution.x+tilePosition.y)*maskResolution.y;let batchRange=sliceRange/CLUSTLIGHT_BATCH;var batchOffset=batchRange.x*CLUSTLIGHT_BATCH;tileIndex+=batchRange.x;for (var i=batchRange.x; i<=batchRange.y; i+=1) {var mask=tileMaskBuffer{X}[tileIndex];tileIndex+=1;let maskOffset=max(sliceRange.x,batchOffset)-batchOffset; 
let maskWidth=min(sliceRange.y-batchOffset+1,CLUSTLIGHT_BATCH);mask=extractBits(mask,maskOffset,maskWidth);while mask != 0 {let trailing=firstTrailingBit(mask);mask ^= 1u<<trailing;let light=getClusteredLight(lightDataTexture,batchOffset+maskOffset+trailing);var preInfo=computePointAndSpotPreLightingInfo(light.vLightData,V,N,posW);preInfo.NdotV=NdotV;preInfo.attenuation=computeDistanceLightFalloff(preInfo.lightOffset,preInfo.lightDistanceSquared,light.vLightFalloff.x,light.vLightFalloff.y);if light.vLightDirection.w>=0.0 {preInfo.attenuation*=computeDirectionalLightFalloff(light.vLightDirection.xyz,preInfo.L,light.vLightDirection.w,light.vLightData.w,light.vLightFalloff.z,light.vLightFalloff.w);}
preInfo.roughness=adjustRoughnessFromLightProperties(reflectivityOut.roughness,light.vLightSpecular.a,preInfo.lightDistance);preInfo.diffuseRoughness=reflectivityOut.diffuseRoughness;preInfo.surfaceAlbedo=surfaceAlbedo;
#ifdef IRIDESCENCE
preInfo.iridescenceIntensity=iridescenceIntensity;
#endif
var info: lightingInfo;
#ifdef SS_TRANSLUCENCY
#ifdef SS_TRANSLUCENCY_LEGACY
info.diffuse=computeDiffuseTransmittedLighting(preInfo,light.vLightDiffuse.rgb,subSurfaceOut.transmittance);info.diffuseTransmission=vec3(0);
#else
info.diffuse=computeDiffuseLighting(preInfo,light.vLightDiffuse.rgb)*(1.0-subSurfaceOut.translucencyIntensity);info.diffuseTransmission=computeDiffuseTransmittedLighting(preInfo,light.vLightDiffuse.rgb,subSurfaceOut.transmittance);
#endif
#else
info.diffuse=computeDiffuseLighting(preInfo,light.vLightDiffuse.rgb);
#endif
#ifdef SPECULARTERM
#if CONDUCTOR_SPECULAR_MODEL==CONDUCTOR_SPECULAR_MODEL_OPENPBR
let metalFresnel=reflectivityOut.specularWeight*getF82Specular(preInfo.VdotH,specularEnvironmentR0,reflectivityOut.colorReflectanceF90,reflectivityOut.roughness);let dielectricFresnel=fresnelSchlickGGXVec3(preInfo.VdotH,reflectivityOut.dielectricColorF0,reflectivityOut.colorReflectanceF90);let coloredFresnel=mix(dielectricFresnel,metalFresnel,reflectivityOut.metallic);
#else
let coloredFresnel=fresnelSchlickGGXVec3(preInfo.VdotH,specularEnvironmentR0,reflectivityOut.colorReflectanceF90);
#endif
#ifndef LEGACY_SPECULAR_ENERGY_CONSERVATION
let NdotH=dot(N,preInfo.H);let fresnel=fresnelSchlickGGXVec3(NdotH,vec3(reflectanceF0),specularEnvironmentR90);info.diffuse*=(vec3(1.0)-fresnel);
#endif
#ifdef ANISOTROPIC
info.specular=computeAnisotropicSpecularLighting(preInfo,V,N,anisotropicOut.anisotropicTangent,anisotropicOut.anisotropicBitangent,anisotropicOut.anisotropy,specularEnvironmentR0,specularEnvironmentR90,AARoughnessFactor,light.vLightDiffuse.rgb);
#else
info.specular=computeSpecularLighting(preInfo,N,specularEnvironmentR0,coloredFresnel,AARoughnessFactor,light.vLightDiffuse.rgb);
#endif
#endif
#ifdef SHEEN
#ifdef SHEEN_LINKWITHALBEDO
preInfo.roughness=sheenOut.sheenIntensity;
#else
preInfo.roughness=adjustRoughnessFromLightProperties(sheenOut.sheenRoughness,light.vLightSpecular.a,preInfo.lightDistance);
#endif
info.sheen=computeSheenLighting(preInfo,normalW,sheenOut.sheenColor,specularEnvironmentR90,AARoughnessFactor,light.vLightDiffuse.rgb);
#endif
#ifdef CLEARCOAT
preInfo.roughness=adjustRoughnessFromLightProperties(clearcoatOut.clearCoatRoughness,light.vLightSpecular.a,preInfo.lightDistance);info.clearCoat=computeClearCoatLighting(preInfo,clearcoatOut.clearCoatNormalW,clearcoatOut.clearCoatAARoughnessFactors.x,clearcoatOut.clearCoatIntensity,light.vLightDiffuse.rgb);
#ifdef CLEARCOAT_TINT
let absorption=computeClearCoatLightingAbsorption(clearcoatOut.clearCoatNdotVRefract,preInfo.L,clearcoatOut.clearCoatNormalW,clearcoatOut.clearCoatColor,clearcoatOut.clearCoatThickness,clearcoatOut.clearCoatIntensity);info.diffuse*=absorption;
#ifdef SS_TRANSLUCENCY
info.diffuseTransmission*=absorption;
#endif
#ifdef SPECULARTERM
info.specular*=absorption;
#endif
#endif
info.diffuse*=info.clearCoat.w;
#ifdef SS_TRANSLUCENCY
info.diffuseTransmission*=info.clearCoat.w;
#endif
#ifdef SPECULARTERM
info.specular*=info.clearCoat.w;
#endif
#ifdef SHEEN
info.sheen*=info.clearCoat.w;
#endif
#endif
result.diffuse+=info.diffuse;
#ifdef SS_TRANSLUCENCY
result.diffuseTransmission+=info.diffuseTransmission;
#endif
#ifdef SPECULARTERM
result.specular+=info.specular;
#endif
#ifdef CLEARCOAT
result.clearCoat+=info.clearCoat;
#endif
#ifdef SHEEN
result.sheen+=info.sheen;
#endif
}
batchOffset+=CLUSTLIGHT_BATCH;}
return result;}
#endif
`;r.f.IncludesShadersStoreWGSL[S]||(r.f.IncludesShadersStoreWGSL[S]=g),e.s(["f",0,{name:S,shader:g}],90068),e.i(98135);let L="pbrDirectLightingFunctions",R=`#define CLEARCOATREFLECTANCE90 1.0
struct lightingInfo
{diffuse: vec3f,
#ifdef SS_TRANSLUCENCY
diffuseTransmission: vec3f,
#endif
#ifdef SPECULARTERM
specular: vec3f,
#endif
#ifdef CLEARCOAT
clearCoat: vec4f,
#endif
#ifdef SHEEN
sheen: vec3f
#endif
};fn adjustRoughnessFromLightProperties(roughness: f32,lightRadius: f32,lightDistance: f32)->f32 {
#if defined(USEPHYSICALLIGHTFALLOFF) || defined(USEGLTFLIGHTFALLOFF)
var lightRoughness: f32=lightRadius/lightDistance;var totalRoughness: f32=saturate(lightRoughness+roughness);return totalRoughness;
#else
return roughness;
#endif
}
fn computeHemisphericDiffuseLighting(info: preLightingInfo,lightColor: vec3f,groundColor: vec3f)->vec3f {return mix(groundColor,lightColor,info.NdotL);}
#if defined(AREALIGHTUSED) && defined(AREALIGHTSUPPORTED)
fn computeAreaDiffuseLighting(info: preLightingInfo,lightColor: vec3f)->vec3f {return info.areaLightDiffuse*lightColor;}
#endif
fn computeDiffuseLighting(info: preLightingInfo,lightColor: vec3f)->vec3f {var diffuseTerm: vec3f=vec3f(1.0/PI);
#if BASE_DIFFUSE_MODEL==BRDF_DIFFUSE_MODEL_LEGACY
diffuseTerm=vec3f(diffuseBRDF_Burley(info.NdotL,info.NdotV,info.VdotH,info.roughness));
#elif BASE_DIFFUSE_MODEL==BRDF_DIFFUSE_MODEL_BURLEY
diffuseTerm=vec3f(diffuseBRDF_Burley(info.NdotL,info.NdotV,info.VdotH,info.diffuseRoughness));
#elif BASE_DIFFUSE_MODEL==BRDF_DIFFUSE_MODEL_EON
var clampedAlbedo: vec3f=clamp(info.surfaceAlbedo,vec3f(0.1),vec3f(1.0));diffuseTerm=diffuseBRDF_EON(clampedAlbedo,info.diffuseRoughness,info.NdotL,info.NdotV,info.LdotV);diffuseTerm/=clampedAlbedo;
#endif
return diffuseTerm*info.attenuation*info.NdotL*lightColor;}
fn computeProjectionTextureDiffuseLighting(projectionLightTexture: texture_2d<f32>,projectionLightSampler: sampler,textureProjectionMatrix: mat4x4f,posW: vec3f)->vec3f{var strq: vec4f=textureProjectionMatrix* vec4f(posW,1.0);strq/=strq.w;var textureColor: vec3f=textureSample(projectionLightTexture,projectionLightSampler,strq.xy).rgb;return toLinearSpaceVec3(textureColor);}
#ifdef SS_TRANSLUCENCY
fn computeDiffuseTransmittedLighting(info: preLightingInfo,lightColor: vec3f,transmittance: vec3f)->vec3f {var transmittanceNdotL=vec3f(0.0);var NdotL: f32=absEps(info.NdotLUnclamped);
#ifndef SS_TRANSLUCENCY_LEGACY
if (info.NdotLUnclamped<0.0) {
#endif
var wrapNdotL: f32=computeWrappedDiffuseNdotL(NdotL,0.02);var trAdapt: f32=step(0.,info.NdotLUnclamped);transmittanceNdotL=mix(transmittance*wrapNdotL, vec3f(wrapNdotL),trAdapt);
#ifndef SS_TRANSLUCENCY_LEGACY
}
var diffuseTerm : vec3f=vec3f(1.0/PI);
#if BASE_DIFFUSE_MODEL==BRDF_DIFFUSE_MODEL_LEGACY
diffuseTerm=vec3f(diffuseBRDF_Burley(
info.NdotL,info.NdotV,info.VdotH,info.roughness));
#elif BASE_DIFFUSE_MODEL==BRDF_DIFFUSE_MODEL_BURLEY
diffuseTerm=vec3f(diffuseBRDF_Burley(
info.NdotL,info.NdotV,info.VdotH,info.diffuseRoughness));
#elif BASE_DIFFUSE_MODEL==BRDF_DIFFUSE_MODEL_EON
var clampedAlbedo: vec3f=clamp(info.surfaceAlbedo,vec3f(0.1),vec3f(1.0));diffuseTerm=diffuseBRDF_EON(clampedAlbedo,info.diffuseRoughness,
info.NdotL,info.NdotV,info.LdotV);diffuseTerm/=clampedAlbedo;
#endif
return (transmittanceNdotL*diffuseTerm)*info.attenuation*lightColor;
#else
let diffuseTerm=diffuseBRDF_Burley(NdotL,info.NdotV,info.VdotH,info.roughness);return diffuseTerm*transmittanceNdotL*info.attenuation*lightColor;
#endif
}
#endif
#ifdef SPECULARTERM
fn computeSpecularLighting(info: preLightingInfo,N: vec3f,reflectance0: vec3f,fresnel: vec3f,geometricRoughnessFactor: f32,lightColor: vec3f)->vec3f {var NdotH: f32=saturateEps(dot(N,info.H));var roughness: f32=max(info.roughness,geometricRoughnessFactor);var alphaG: f32=convertRoughnessToAverageSlope(roughness);var modifiedFresnel: vec3f=fresnel;
#ifdef IRIDESCENCE
modifiedFresnel=mix(fresnel,reflectance0,info.iridescenceIntensity);
#endif
var distribution: f32=normalDistributionFunction_TrowbridgeReitzGGX(NdotH,alphaG);
#ifdef BRDF_V_HEIGHT_CORRELATED
var smithVisibility: f32=smithVisibility_GGXCorrelated(info.NdotL,info.NdotV,alphaG);
#else
var smithVisibility: f32=smithVisibility_TrowbridgeReitzGGXFast(info.NdotL,info.NdotV,alphaG);
#endif
var specTerm: vec3f=modifiedFresnel*distribution*smithVisibility;return specTerm*info.attenuation*info.NdotL*lightColor;}
#if defined(AREALIGHTUSED) && defined(AREALIGHTSUPPORTED)
fn computeAreaSpecularLighting(info: preLightingInfo,specularColor: vec3f,reflectance0: vec3f,reflectance90: vec3f)->vec3f {var fresnel:vec3f =reflectance0*specularColor*info.areaLightFresnel.x+( vec3f( 1.0 )-specularColor )*info.areaLightFresnel.y*reflectance90;return specularColor*fresnel*info.areaLightSpecular;}
fn computeOpenPBRAreaSpecularLighting(info: preLightingInfo,lightColor: vec3f,reflectance0: vec3f,reflectance90: vec3f)->vec3f {let fresnel: vec3f=reflectance0*info.areaLightFresnel.x+(reflectance90-reflectance0)*info.areaLightFresnel.y;return lightColor*fresnel*info.areaLightSpecular;}
#if CONDUCTOR_SPECULAR_MODEL==CONDUCTOR_SPECULAR_MODEL_OPENPBR
fn computeOpenPBRAreaConductorSpecularLighting(info: preLightingInfo,lightColor: vec3f,reflectance0: vec3f,edgeTint: vec3f)->vec3f {let b: vec3f=getF82B(reflectance0,edgeTint);let normalizedSchlickMoment: f32=clamp(info.areaLightFresnel.y/max(info.areaLightFresnel.x,Epsilon),0.0f,1.0f);let representativeOneMinusCosTheta: f32=pow(normalizedSchlickMoment,0.2f);let f82DipMoment: f32=info.areaLightFresnel.y*representativeOneMinusCosTheta*(1.0f-representativeOneMinusCosTheta);let fresnel: vec3f=reflectance0*info.areaLightFresnel.x+(vec3f(1.0f)-reflectance0)*info.areaLightFresnel.y-b*f82DipMoment;return lightColor*clamp(fresnel,vec3f(0.0f),vec3f(info.areaLightFresnel.x))*info.areaLightSpecular;}
#endif
fn computeOpenPBRAreaFresnel(info: preLightingInfo,reflectance0: f32,reflectance90: f32)->f32 {return reflectance0*info.areaLightFresnel.x+(reflectance90-reflectance0)*info.areaLightFresnel.y;}
#endif
#endif
#ifdef FUZZ
fn evalFuzz(L: vec3f,NdotL: f32,NdotV: f32,T: vec3f,B: vec3f,ltcLut: vec3f)->f32
{if (NdotL<=0.0f || NdotV<=0.0f) {return 0.0f;}
let M=mat3x3f(
vec3f(ltcLut.r,0.0f,0.0f),
vec3f(ltcLut.g,1.0f,0.0f),
vec3f(0.0f,0.0f,1.0f)
);let Llocal: vec3f=vec3f(dot(L,T),dot(L,B),NdotL);let Lwarp: vec3f=normalize(M*Llocal);let cosThetaWarp: f32=max(Lwarp.z,0.0f);return cosThetaWarp*NdotL;}
#endif
#if defined(ANISOTROPIC) && defined(ANISOTROPIC_OPENPBR)
fn computeAnisotropicSpecularLighting(info: preLightingInfo,V: vec3f,N: vec3f,T: vec3f,B: vec3f,anisotropy: f32,geometricRoughnessFactor: f32,lightColor: vec3f)->vec3f {var NdotH: f32=saturateEps(dot(N,info.H));var TdotH: f32=dot(T,info.H);var BdotH: f32=dot(B,info.H);var TdotV: f32=dot(T,V);var BdotV: f32=dot(B,V);var TdotL: f32=dot(T,info.L);var BdotL: f32=dot(B,info.L);var alphaG: f32=convertRoughnessToAverageSlope(info.roughness);var alphaTB: vec2f=getAnisotropicRoughness(alphaG,anisotropy);var distribution: f32=normalDistributionFunction_BurleyGGX_Anisotropic(NdotH,TdotH,BdotH,alphaTB);var smithVisibility: f32=smithVisibility_GGXCorrelated_Anisotropic(info.NdotL,info.NdotV,TdotV,BdotV,TdotL,BdotL,alphaTB);var specTerm: vec3f=vec3f(distribution*smithVisibility);return specTerm*info.attenuation*info.NdotL*lightColor;}
#elif defined(ANISOTROPIC)
fn computeAnisotropicSpecularLighting(info: preLightingInfo,V: vec3f,N: vec3f,T: vec3f,B: vec3f,anisotropy: f32,reflectance0: vec3f,reflectance90: vec3f,geometricRoughnessFactor: f32,lightColor: vec3f)->vec3f {var NdotH: f32=saturateEps(dot(N,info.H));var TdotH: f32=dot(T,info.H);var BdotH: f32=dot(B,info.H);var TdotV: f32=dot(T,V);var BdotV: f32=dot(B,V);var TdotL: f32=dot(T,info.L);var BdotL: f32=dot(B,info.L);var alphaG: f32=convertRoughnessToAverageSlope(info.roughness);var alphaTB: vec2f=getAnisotropicRoughness(alphaG,anisotropy);alphaTB=max(alphaTB,vec2f(geometricRoughnessFactor*geometricRoughnessFactor));var fresnel: vec3f=fresnelSchlickGGXVec3(info.VdotH,reflectance0,reflectance90);
#ifdef IRIDESCENCE
fresnel=mix(fresnel,reflectance0,info.iridescenceIntensity);
#endif
var distribution: f32=normalDistributionFunction_BurleyGGX_Anisotropic(NdotH,TdotH,BdotH,alphaTB);var smithVisibility: f32=smithVisibility_GGXCorrelated_Anisotropic(info.NdotL,info.NdotV,TdotV,BdotV,TdotL,BdotL,alphaTB);var specTerm: vec3f=fresnel*distribution*smithVisibility;return specTerm*info.attenuation*info.NdotL*lightColor;}
#endif
#ifdef CLEARCOAT
fn computeClearCoatLighting(info: preLightingInfo,Ncc: vec3f,geometricRoughnessFactor: f32,clearCoatIntensity: f32,lightColor: vec3f)->vec4f {var NccdotL: f32=saturateEps(dot(Ncc,info.L));var NccdotH: f32=saturateEps(dot(Ncc,info.H));var clearCoatRoughness: f32=max(info.roughness,geometricRoughnessFactor);var alphaG: f32=convertRoughnessToAverageSlope(clearCoatRoughness);var fresnel: f32=fresnelSchlickGGX(info.VdotH,uniforms.vClearCoatRefractionParams.x,CLEARCOATREFLECTANCE90);fresnel*=clearCoatIntensity;var distribution: f32=normalDistributionFunction_TrowbridgeReitzGGX(NccdotH,alphaG);var kelemenVisibility: f32=visibility_Kelemen(info.VdotH);var clearCoatTerm: f32=fresnel*distribution*kelemenVisibility;return vec4f(
clearCoatTerm*info.attenuation*NccdotL*lightColor,
1.0-fresnel
);}
fn computeClearCoatLightingAbsorption(NdotVRefract: f32,L: vec3f,Ncc: vec3f,clearCoatColor: vec3f,clearCoatThickness: f32,clearCoatIntensity: f32)->vec3f {var LRefract: vec3f=-refract(L,Ncc,uniforms.vClearCoatRefractionParams.y);var NdotLRefract: f32=saturateEps(dot(Ncc,LRefract));var absorption: vec3f=computeClearCoatAbsorption(NdotVRefract,NdotLRefract,clearCoatColor,clearCoatThickness,clearCoatIntensity);return absorption;}
#endif
#ifdef SHEEN
fn computeSheenLighting(info: preLightingInfo,N: vec3f,reflectance0: vec3f,reflectance90: vec3f,geometricRoughnessFactor: f32,lightColor: vec3f)->vec3f {var NdotH: f32=saturateEps(dot(N,info.H));var roughness: f32=max(info.roughness,geometricRoughnessFactor);var alphaG: f32=convertRoughnessToAverageSlope(roughness);var fresnel: f32=1.;var distribution: f32=normalDistributionFunction_CharlieSheen(NdotH,alphaG);/*#ifdef SHEEN_SOFTER
var visibility: f32=visibility_CharlieSheen(info.NdotL,info.NdotV,alphaG);
#else */
var visibility: f32=visibility_Ashikhmin(info.NdotL,info.NdotV);/* #endif */
var sheenTerm: f32=fresnel*distribution*visibility;return sheenTerm*info.attenuation*info.NdotL*lightColor;}
#endif
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
#include<clusteredLightingFunctions>
#include<pbrClusteredLightingFunctions>[0..maxSimultaneousLights]
#endif
`;r.f.IncludesShadersStoreWGSL[L]||(r.f.IncludesShadersStoreWGSL[L]=R),e.s(["f",0,{name:L,shader:R}],40951);let I="pbrBlockNormalGeometric",N=`var viewDirectionW: vec3f=normalize(scene.vEyePosition.xyz-input.vPositionW);
#ifdef NORMAL
var normalW: vec3f=normalize(input.vNormalW);
#else
var normalW: vec3f=normalize(cross(dpdx(input.vPositionW),dpdy(input.vPositionW)))*scene.vEyePosition.w;
#endif
var geometricNormalW: vec3f=normalW;
#if defined(TWOSIDEDLIGHTING) && defined(NORMAL)
geometricNormalW=select(-geometricNormalW,geometricNormalW,fragmentInputs.frontFacing);
#endif
`;r.f.IncludesShadersStoreWGSL[I]||(r.f.IncludesShadersStoreWGSL[I]=N),e.s(["f",0,{name:I,shader:N}],72596);let C="pbrBlockImageProcessing",A=`#if defined(IMAGEPROCESSINGPOSTPROCESS) || defined(SS_SCATTERING)
#if !defined(SKIPFINALCOLORCLAMP)
finalColor=vec4f(clamp(finalColor.rgb,vec3f(0.),vec3f(30.0)),finalColor.a);
#endif
#else
finalColor=applyImageProcessing(finalColor);
#endif
finalColor=vec4f(finalColor.rgb,finalColor.a*mesh.visibility);
#ifdef PREMULTIPLYALPHA
finalColor=vec4f(finalColor.rgb*finalColor.a,finalColor.a);;
#endif
`;r.f.IncludesShadersStoreWGSL[C]||(r.f.IncludesShadersStoreWGSL[C]=A),e.s(["f",0,{name:C,shader:A}],88558);let T="pbrDebug",D=`#if DEBUGMODE>0
if (input.vClipSpacePosition.x/input.vClipSpacePosition.w>=uniforms.vDebugMode.x) {var color: vec3f;
#if DEBUGMODE==1
color=fragmentInputs.vPositionW.rgb;
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==2 && defined(NORMAL)
color=fragmentInputs.vNormalW.rgb;
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==3 && defined(BUMP) || DEBUGMODE==3 && defined(PARALLAX) || DEBUGMODE==3 && defined(ANISOTROPIC)
color=TBN[0];
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==4 && defined(BUMP) || DEBUGMODE==4 && defined(PARALLAX) || DEBUGMODE==4 && defined(ANISOTROPIC)
color=TBN[1];
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==5
color=normalW;
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==6 && defined(MAINUV1)
color= vec3f(input.vMainUV1,0.0);
#elif DEBUGMODE==7 && defined(MAINUV2)
color= vec3f(input.vMainUV2,0.0);
#elif DEBUGMODE==8 && defined(CLEARCOAT) && defined(CLEARCOAT_BUMP)
color=clearcoatOut.TBNClearCoat[0];
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==9 && defined(CLEARCOAT) && defined(CLEARCOAT_BUMP)
color=clearcoatOut.TBNClearCoat[1];
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==10 && defined(CLEARCOAT)
color=clearcoatOut.clearCoatNormalW;
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==11 && defined(ANISOTROPIC)
color=anisotropicOut.anisotropicNormal;
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==12 && defined(ANISOTROPIC)
color=anisotropicOut.anisotropicTangent;
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==13 && defined(ANISOTROPIC)
color=anisotropicOut.anisotropicBitangent;
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==20 && defined(ALBEDO)
color=albedoTexture.rgb;
#ifndef GAMMAALBEDO
#define DEBUGMODE_GAMMA
#endif
#elif DEBUGMODE==21 && defined(AMBIENT)
color=aoOut.ambientOcclusionColorMap.rgb;
#elif DEBUGMODE==22 && defined(OPACITY)
color=opacityMap.rgb;
#elif DEBUGMODE==23 && defined(EMISSIVE)
color=emissiveColorTex.rgb;
#ifndef GAMMAEMISSIVE
#define DEBUGMODE_GAMMA
#endif
#elif DEBUGMODE==24 && defined(LIGHTMAP)
color=lightmapColor;
#ifndef GAMMALIGHTMAP
#define DEBUGMODE_GAMMA
#endif
#elif DEBUGMODE==25 && defined(REFLECTIVITY) && defined(METALLICWORKFLOW)
color=reflectivityOut.surfaceMetallicColorMap.rgb;
#elif DEBUGMODE==26 && defined(REFLECTIVITY) && !defined(METALLICWORKFLOW)
color=reflectivityOut.surfaceReflectivityColorMap.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==27 && defined(CLEARCOAT) && defined(CLEARCOAT_TEXTURE)
color= vec3f(clearcoatOut.clearCoatMapData.rg,0.0);
#elif DEBUGMODE==28 && defined(CLEARCOAT) && defined(CLEARCOAT_TINT) && defined(CLEARCOAT_TINT_TEXTURE)
color=clearcoatOut.clearCoatTintMapData.rgb;
#elif DEBUGMODE==29 && defined(SHEEN) && defined(SHEEN_TEXTURE)
color=sheenOut.sheenMapData.rgb;
#elif DEBUGMODE==30 && defined(ANISOTROPIC) && defined(ANISOTROPIC_TEXTURE)
color=anisotropicOut.anisotropyMapData.rgb;
#elif DEBUGMODE==31 && defined(SUBSURFACE) && defined(SS_THICKNESSANDMASK_TEXTURE)
color=subSurfaceOut.thicknessMap.rgb;
#elif DEBUGMODE==32 && defined(BUMP)
color=textureSample(bumpSampler,bumpSamplerSampler,fragmentInputs.vBumpUV).rgb;
#elif DEBUGMODE==40 && defined(SS_REFRACTION)
color=subSurfaceOut.environmentRefraction.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==41 && defined(REFLECTION)
color=reflectionOut.environmentRadiance.rgb;
#ifndef GAMMAREFLECTION
#define DEBUGMODE_GAMMA
#endif
#elif DEBUGMODE==42 && defined(CLEARCOAT) && defined(REFLECTION)
color=clearcoatOut.environmentClearCoatRadiance.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==50
color=diffuseBase.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==51 && defined(SPECULARTERM)
color=specularBase.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==52 && defined(CLEARCOAT)
color=clearCoatBase.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==53 && defined(SHEEN)
color=sheenBase.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==54 && defined(REFLECTION)
color=reflectionOut.environmentIrradiance.rgb;
#ifndef GAMMAREFLECTION
#define DEBUGMODE_GAMMA
#endif
#elif DEBUGMODE==60
color=surfaceAlbedo.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==61
color=clearcoatOut.specularEnvironmentR0;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==62 && defined(METALLICWORKFLOW)
color= vec3f(reflectivityOut.metallic);
#elif DEBUGMODE==71 && defined(METALLICWORKFLOW)
color=reflectivityOut.metallicF0;
#elif DEBUGMODE==63
color= vec3f(roughness);
#elif DEBUGMODE==64
color= vec3f(alphaG);
#elif DEBUGMODE==65
color= vec3f(NdotV);
#elif DEBUGMODE==66 && defined(CLEARCOAT) && defined(CLEARCOAT_TINT)
color=clearcoatOut.clearCoatColor;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==67 && defined(CLEARCOAT)
color= vec3f(clearcoatOut.clearCoatRoughness);
#elif DEBUGMODE==68 && defined(CLEARCOAT)
color= vec3f(clearcoatOut.clearCoatNdotV);
#elif DEBUGMODE==69 && defined(SUBSURFACE) && defined(SS_TRANSLUCENCY)
color=subSurfaceOut.transmittance;
#elif DEBUGMODE==70 && defined(SUBSURFACE) && defined(SS_REFRACTION)
color=subSurfaceOut.refractionTransmittance;
#elif DEBUGMODE==72
color= vec3f(microSurface);
#elif DEBUGMODE==73
color=uniforms.vAlbedoColor.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==74 && !defined(METALLICWORKFLOW)
color=uniforms.vReflectivityColor.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==75
color=uniforms.vEmissiveColor;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==80 && defined(RADIANCEOCCLUSION)
color= vec3f(seo);
#elif DEBUGMODE==81 && defined(HORIZONOCCLUSION) && defined(BUMP) && defined(REFLECTIONMAP_3D)
color= vec3f(eho);
#elif DEBUGMODE==82 && defined(MS_BRDF_ENERGY_CONSERVATION)
color= vec3f(energyConservationFactor);
#elif DEBUGMODE==83 && defined(ENVIRONMENTBRDF) && !defined(REFLECTIONMAP_SKYBOX)
color=baseSpecularEnvironmentReflectance;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==84 && defined(CLEARCOAT) && defined(ENVIRONMENTBRDF) && !defined(REFLECTIONMAP_SKYBOX)
color=clearcoatOut.clearCoatEnvironmentReflectance;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==85 && defined(SHEEN) && defined(REFLECTION)
color=sheenOut.sheenEnvironmentReflectance;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==86 && defined(ALPHABLEND)
color= vec3f(luminanceOverAlpha);
#elif DEBUGMODE==87
color= vec3f(alpha);
#elif DEBUGMODE==88 && defined(ALBEDO)
color= vec3f(albedoTexture.a);
#elif DEBUGMODE==89
color=aoOut.ambientOcclusionColor;
#else
var stripeWidth: f32=30.;var stripePos: f32=abs(floor(input.position.x/stripeWidth));var whichColor: f32=((stripePos)%(2.));var color1: vec3f= vec3f(.6,.2,.2);var color2: vec3f= vec3f(.3,.1,.1);color=mix(color1,color2,whichColor);
#endif
color*=uniforms.vDebugMode.y;
#ifdef DEBUGMODE_NORMALIZE
color=normalize(color)*0.5+0.5;
#endif
#ifdef DEBUGMODE_GAMMA
color=toGammaSpaceVec3(color);
#endif
fragmentOutputs.color=vec4f(color,1.0);
#ifdef PREPASS
#if SCENE_MRT_COUNT>0 && (!defined(PREPASS_MESH_BLEND_TAG) || PREPASS_MESH_BLEND_TAG_INDEX != 0) && (!defined(PREPASS_OBJECT_ID) || PREPASS_OBJECT_ID_INDEX != 0)
fragmentOutputs.fragData0=vec4f(toLinearSpaceVec3(color),1.0); 
#endif
#if SCENE_MRT_COUNT>1 && (!defined(PREPASS_MESH_BLEND_TAG) || PREPASS_MESH_BLEND_TAG_INDEX != 1) && (!defined(PREPASS_OBJECT_ID) || PREPASS_OBJECT_ID_INDEX != 1)
fragmentOutputs.fragData1=vec4f(0.,0.,0.,0.); 
#endif
#endif
#ifdef DEBUGMODE_FORCERETURN
return fragmentOutputs;
#endif
}
#endif
`;r.f.IncludesShadersStoreWGSL[T]||(r.f.IncludesShadersStoreWGSL[T]=D),e.s(["f",0,{name:T,shader:D}],91032)},700,48424,e=>{"use strict";var r=e.i(47662);let f="pbrFragmentReflectionDeclaration",i=`#ifdef REFLECTION
#ifdef REFLECTIONMAP_3D
var reflectionSamplerSampler: sampler;var reflectionSampler: texture_cube<f32>;
#ifdef LODBASEDMICROSFURACE
#else
var reflectionLowSamplerSampler: sampler;var reflectionLowSampler: texture_cube<f32>;var reflectionHighSamplerSampler: sampler;var reflectionHighSampler: texture_cube<f32>;
#endif
#ifdef USEIRRADIANCEMAP
var irradianceSamplerSampler: sampler;var irradianceSampler: texture_cube<f32>;
#endif
#else
var reflectionSamplerSampler: sampler;var reflectionSampler: texture_2d<f32>;
#ifdef LODBASEDMICROSFURACE
#else
var reflectionLowSamplerSampler: sampler;var reflectionLowSampler: texture_2d<f32>;var reflectionHighSamplerSampler: sampler;var reflectionHighSampler: texture_2d<f32>;
#endif
#ifdef USEIRRADIANCEMAP
var irradianceSamplerSampler: sampler;var irradianceSampler: texture_2d<f32>;
#endif
#endif
#ifdef REFLECTIONMAP_SKYBOX
varying vPositionUVW: vec3f;
#else
#if defined(REFLECTIONMAP_EQUIRECTANGULAR_FIXED) || defined(REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED)
varying vDirectionW: vec3f;
#endif
#endif
#endif
`;r.f.IncludesShadersStoreWGSL[f]||(r.f.IncludesShadersStoreWGSL[f]=i),e.s(["f",0,{name:f,shader:i}],700);let n="pbrIBLFunctions",t=`#if defined(REFLECTION) || defined(SS_REFRACTION)
fn getLodFromAlphaG(cubeMapDimensionPixels: f32,microsurfaceAverageSlope: f32)->f32 {var microsurfaceAverageSlopeTexels: f32=cubeMapDimensionPixels*microsurfaceAverageSlope;var lod: f32=log2(microsurfaceAverageSlopeTexels);return lod;}
fn getLinearLodFromRoughness(cubeMapDimensionPixels: f32,roughness: f32)->f32 {var lod: f32=log2(cubeMapDimensionPixels)*roughness;return lod;}
#endif
#if defined(ENVIRONMENTBRDF) && defined(RADIANCEOCCLUSION)
fn environmentRadianceOcclusion(ambientOcclusion: f32,NdotVUnclamped: f32)->f32 {var temp: f32=NdotVUnclamped+ambientOcclusion;return saturate(temp*temp-1.0+ambientOcclusion);}
#endif
#if defined(ENVIRONMENTBRDF) && defined(HORIZONOCCLUSION)
fn environmentHorizonOcclusion(view: vec3f,normal: vec3f,geometricNormal: vec3f)->f32 {var reflection: vec3f=reflect(view,normal);var temp: f32=saturate(1.0+1.1*dot(reflection,geometricNormal));return temp*temp;}
#endif
#if defined(LODINREFLECTIONALPHA) || defined(SS_LODINREFRACTIONALPHA)
fn UNPACK_LOD(x: f32)->f32 {return (1.0-x)*255.0;}
fn getLodFromAlphaGNdotV(cubeMapDimensionPixels: f32,alphaG: f32,NdotV: f32)->f32 {var microsurfaceAverageSlope: f32=alphaG;microsurfaceAverageSlope*=sqrt(abs(NdotV));return getLodFromAlphaG(cubeMapDimensionPixels,microsurfaceAverageSlope);}
#endif
`;r.f.IncludesShadersStoreWGSL[n]||(r.f.IncludesShadersStoreWGSL[n]=t),e.s(["f",0,{name:n,shader:t}],48424)},20928,79799,e=>{"use strict";var r=e.i(47662);let f="samplerFragmentDeclaration",i=`#ifdef _DEFINENAME_
#if _DEFINENAME_DIRECTUV==1
#define v_VARYINGNAME_UV vMainUV1
#elif _DEFINENAME_DIRECTUV==2
#define v_VARYINGNAME_UV vMainUV2
#elif _DEFINENAME_DIRECTUV==3
#define v_VARYINGNAME_UV vMainUV3
#elif _DEFINENAME_DIRECTUV==4
#define v_VARYINGNAME_UV vMainUV4
#elif _DEFINENAME_DIRECTUV==5
#define v_VARYINGNAME_UV vMainUV5
#elif _DEFINENAME_DIRECTUV==6
#define v_VARYINGNAME_UV vMainUV6
#else
varying v_VARYINGNAME_UV: vec2f;
#endif
var _SAMPLERNAME_SamplerSampler: sampler;var _SAMPLERNAME_Sampler: texture_2d<f32>;
#endif
`;r.f.IncludesShadersStoreWGSL[f]||(r.f.IncludesShadersStoreWGSL[f]=i),e.s(["f",0,{name:f,shader:i}],20928);let n="reflectionFunction",t=`fn computeFixedEquirectangularCoords(worldPos: vec4f,worldNormal: vec3f,direction: vec3f)->vec3f
{var lon: f32=atan2(direction.z,direction.x);var lat: f32=acos(direction.y);var sphereCoords: vec2f= vec2f(lon,lat)*RECIPROCAL_PI2*2.0;var s: f32=sphereCoords.x*0.5+0.5;var t: f32=sphereCoords.y;return vec3f(s,t,0); }
fn computeMirroredFixedEquirectangularCoords(worldPos: vec4f,worldNormal: vec3f,direction: vec3f)->vec3f
{var lon: f32=atan2(direction.z,direction.x);var lat: f32=acos(direction.y);var sphereCoords: vec2f= vec2f(lon,lat)*RECIPROCAL_PI2*2.0;var s: f32=sphereCoords.x*0.5+0.5;var t: f32=sphereCoords.y;return vec3f(1.0-s,t,0); }
fn computeEquirectangularCoords(worldPos: vec4f,worldNormal: vec3f,eyePosition: vec3f,reflectionMatrix: mat4x4f)->vec3f
{var cameraToVertex: vec3f=normalize(worldPos.xyz-eyePosition);var r: vec3f=normalize(reflect(cameraToVertex,worldNormal));r= (reflectionMatrix* vec4f(r,0)).xyz;var lon: f32=atan2(r.z,r.x);var lat: f32=acos(r.y);var sphereCoords: vec2f= vec2f(lon,lat)*RECIPROCAL_PI2*2.0;var s: f32=sphereCoords.x*0.5+0.5;var t: f32=sphereCoords.y;return vec3f(s,t,0);}
fn computeSphericalCoords(worldPos: vec4f,worldNormal: vec3f,view: mat4x4f,reflectionMatrix: mat4x4f)->vec3f
{var viewDir: vec3f=normalize((view*worldPos).xyz);var viewNormal: vec3f=normalize((view* vec4f(worldNormal,0.0)).xyz);var r: vec3f=reflect(viewDir,viewNormal);r= (reflectionMatrix* vec4f(r,0)).xyz;r.z=r.z-1.0;var m: f32=2.0*length(r);return vec3f(r.x/m+0.5,1.0-r.y/m-0.5,0);}
fn computePlanarCoords(worldPos: vec4f,worldNormal: vec3f,eyePosition: vec3f,reflectionMatrix: mat4x4f)->vec3f
{var viewDir: vec3f=worldPos.xyz-eyePosition;var coords: vec3f=normalize(reflect(viewDir,worldNormal));return (reflectionMatrix* vec4f(coords,1)).xyz;}
fn computeCubicCoords(worldPos: vec4f,worldNormal: vec3f,eyePosition: vec3f,reflectionMatrix: mat4x4f)->vec3f
{var viewDir: vec3f=normalize(worldPos.xyz-eyePosition);var coords: vec3f=reflect(viewDir,worldNormal);coords= (reflectionMatrix* vec4f(coords,0)).xyz;
#ifdef INVERTCUBICMAP
coords.y*=-1.0;
#endif
return coords;}
fn computeCubicLocalCoords(worldPos: vec4f,worldNormal: vec3f,eyePosition: vec3f,reflectionMatrix: mat4x4f,reflectionSize: vec3f,reflectionPosition: vec3f)->vec3f
{var viewDir: vec3f=normalize(worldPos.xyz-eyePosition);var coords: vec3f=reflect(viewDir,worldNormal);coords=parallaxCorrectNormal(worldPos.xyz,coords,reflectionSize,reflectionPosition);coords=(reflectionMatrix* vec4f(coords,0)).xyz;
#ifdef INVERTCUBICMAP
coords.y*=-1.0;
#endif
return coords;}
fn computeProjectionCoords(worldPos: vec4f,view: mat4x4f,reflectionMatrix: mat4x4f)->vec3f
{return (reflectionMatrix*(view*worldPos)).xyz;}
fn computeSkyBoxCoords(positionW: vec3f,reflectionMatrix: mat4x4f)->vec3f
{return (reflectionMatrix* vec4f(positionW,1.)).xyz;}
#ifdef REFLECTION
fn computeReflectionCoords(worldPos: vec4f,worldNormal: vec3f)->vec3f
{
#ifdef REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED
var direction: vec3f=normalize(fragmentInputs.vDirectionW);return computeMirroredFixedEquirectangularCoords(worldPos,worldNormal,direction);
#endif
#ifdef REFLECTIONMAP_EQUIRECTANGULAR_FIXED
var direction: vec3f=normalize(fragmentInputs.vDirectionW);return computeFixedEquirectangularCoords(worldPos,worldNormal,direction);
#endif
#ifdef REFLECTIONMAP_EQUIRECTANGULAR
return computeEquirectangularCoords(worldPos,worldNormal,scene.vEyePosition.xyz,uniforms.reflectionMatrix);
#endif
#ifdef REFLECTIONMAP_SPHERICAL
return computeSphericalCoords(worldPos,worldNormal,scene.view,uniforms.reflectionMatrix);
#endif
#ifdef REFLECTIONMAP_PLANAR
return computePlanarCoords(worldPos,worldNormal,scene.vEyePosition.xyz,uniforms.reflectionMatrix);
#endif
#ifdef REFLECTIONMAP_CUBIC
#ifdef USE_LOCAL_REFLECTIONMAP_CUBIC
return computeCubicLocalCoords(worldPos,worldNormal,scene.vEyePosition.xyz,uniforms.reflectionMatrix,uniforms.vReflectionSize,uniforms.vReflectionPosition);
#else
return computeCubicCoords(worldPos,worldNormal,scene.vEyePosition.xyz,uniforms.reflectionMatrix);
#endif
#endif
#ifdef REFLECTIONMAP_PROJECTION
return computeProjectionCoords(worldPos,scene.view,uniforms.reflectionMatrix);
#endif
#ifndef REFLECTIONMAP_CUBIC
#ifdef REFLECTIONMAP_SKYBOX
return computeSkyBoxCoords(fragmentInputs.vPositionUVW,uniforms.reflectionMatrix);
#endif
#endif
#ifdef REFLECTIONMAP_EXPLICIT
return vec3f(0,0,0);
#endif
}
#endif
`;r.f.IncludesShadersStoreWGSL[n]||(r.f.IncludesShadersStoreWGSL[n]=t),e.s(["f",0,{name:n,shader:t}],79799)},60896,e=>{"use strict";var r=e.i(47662);let f="sceneUboDeclaration",i=`struct Scene {viewProjection : mat4x4<f32>,
#ifdef MULTIVIEW
viewProjectionR : mat4x4<f32>,
#endif 
view : mat4x4<f32>,
projection : mat4x4<f32>,
vEyePosition : vec4<f32>,
inverseProjection : mat4x4<f32>,};
#define SCENE_UBO
var<uniform> scene : Scene;
`;r.f.IncludesShadersStoreWGSL[f]||(r.f.IncludesShadersStoreWGSL[f]=i),e.s(["f",0,{name:f,shader:i}])}]);