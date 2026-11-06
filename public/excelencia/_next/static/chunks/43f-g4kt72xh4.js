(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,42646,e=>{"use strict";var r=e.i(47662);let t="passPixelShader",a=`varying vec2 vUV;uniform sampler2D textureSampler;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=texture2D(textureSampler,vUV);}`;r.f.ShadersStore[t]||(r.f.ShadersStore[t]=a),e.s(["passPixelShader",0,{name:t,shader:a}])}]);