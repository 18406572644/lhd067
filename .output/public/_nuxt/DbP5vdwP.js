import{S as h,U as i}from"./_GZsI7OH.js";const S=h("project",{state:()=>({projects:[],currentProjectId:null}),getters:{getCurrentProject(t){return t.projects.find(e=>e.id===t.currentProjectId)}},actions:{loadProjects(){const t=localStorage.getItem("herbarium_projects");t&&(this.projects=JSON.parse(t))},saveProject(t){const e=this.projects.findIndex(r=>r.id===t.id);e>=0?this.projects[e]=t:this.projects.push(t),this.persist()},deleteProject(t){this.projects=this.projects.filter(e=>e.id!==t),this.currentProjectId===t&&(this.currentProjectId=null),this.persist()},createProject(){const t={id:String(Date.now()),name:"未命名方案",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),thumbnail:"",canvasData:"",labels:[],filters:[]};return this.projects.push(t),this.persist(),t},duplicateProject(t){const e=this.projects.find(s=>s.id===t);if(!e)return;const r={...JSON.parse(JSON.stringify(e)),id:String(Date.now()),name:`${e.name} (副本)`,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};this.projects.push(r),this.persist()},setCurrentProject(t){this.currentProjectId=t},persist(){localStorage.setItem("herbarium_projects",JSON.stringify(this.projects))}}});/**
 * @license lucide-vue-next v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=t=>t.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-vue-next v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var o={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-vue-next v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=({size:t,strokeWidth:e=2,absoluteStrokeWidth:r,color:s,iconNode:n,name:a,class:j,...d},{slots:c})=>i("svg",{...o,width:t||o.width,height:t||o.height,stroke:s||o.stroke,"stroke-width":r?Number(e)*24/Number(t):e,class:["lucide",`lucide-${p(a??"icon")}`],...d},[...n.map(u=>i(...u)),...c.default?[c.default()]:[]]);/**
 * @license lucide-vue-next v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=(t,e)=>(r,{slots:s})=>i(l,{...r,iconNode:e,name:t},s);export{f as c,S as u};
