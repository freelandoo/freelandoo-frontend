(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,81499,e=>{"use strict";var t=e.i(47662);let r="passPixelShader",a=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);}`;t.f.ShadersStoreWGSL[r]||(t.f.ShadersStoreWGSL[r]=a),e.s(["passPixelShaderWGSL",0,{name:r,shader:a}])}]);