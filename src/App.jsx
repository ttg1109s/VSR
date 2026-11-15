import React,{useState} from 'react';
import {Badge,Breadcrumb,Button,Combobox,DataTable,Tabs,TreeView} from './design-system/index.js';

const scenarioRows=[
 {id:'scn-01',name:'The First Signal',status:'Published',updated:'2026-11-12',scenes:8},
 {id:'scn-02',name:'A Quiet Departure',status:'Draft',updated:'2026-11-10',scenes:4},
 {id:'scn-03',name:'The Last Archive',status:'Review',updated:'2026-11-08',scenes:12}
];
const scenarioColumns=[
 {key:'name',header:'Scenario',sortable:true,render:row=><strong>{row.name}</strong>},
 {key:'status',header:'Status',sortable:true,render:row=><Badge tone={row.status==='Published'?'success':row.status==='Review'?'warning':'neutral'} dot>{row.status}</Badge>},
 {key:'updated',header:'Last updated',sortable:true},
 {key:'scenes',header:'Scenes',sortable:true}
];
const treeNodes=[
 {id:'project',label:'Project workspace',icon:'▣',children:[
  {id:'chapter-1',label:'Chapter 1 · Arrival',icon:'▤',children:[{id:'scene-1',label:'The first signal'},{id:'scene-2',label:'A quiet room'}]},
  {id:'chapter-2',label:'Chapter 2 · Departure',icon:'▤',children:[{id:'scene-3',label:'Across the bridge'}]}
 ]}
];
function Showcase(){
 const [tab,setTab]=useState('table'),[status,setStatus]=useState('all'),[selectedNode,setSelectedNode]=useState('scene-1');
 const filteredRows=status==='all'?scenarioRows:scenarioRows.filter(row=>row.status.toLowerCase()===status);
 return <main className="vsr-page vsr-showcase"><header><div><small>VSR · DESIGN SYSTEM</small><h1>Navigation & data components</h1><p>Navigation patterns, hierarchical selection and structured data presentation.</p></div><Badge tone="info">Foundation 03</Badge></header>
 <section><h2>Breadcrumbs and badges</h2><Breadcrumb items={[{label:'Workspace',href:'#workspace'},{label:'Scenarios',href:'#scenarios'},{label:'The First Signal'}]}/><div className="showcase-row showcase-badges"><Badge>Draft</Badge><Badge tone="success" dot>Published</Badge><Badge tone="warning">Needs review</Badge><Badge tone="danger">Failed</Badge><Badge tone="info">Synced</Badge></div></section>
 <section><h2>Tabs</h2><Tabs value={tab} onChange={setTab} items={[{value:'table',label:'Scenarios',badge:3,content:<div className="showcase-stack"><div className="showcase-row"><Combobox label="Filter by status" placeholder="All statuses" value={status==='all'?null:status} onChange={v=>setStatus(v??'all')} options={[{value:'draft',label:'Draft'},{value:'review',label:'Review'},{value:'published',label:'Published'}]}/><Button variant="secondary" onClick={()=>setStatus('all')}>Reset filter</Button></div><DataTable caption="Scenario library" columns={scenarioColumns} rows={filteredRows} striped emptyMessage="No scenarios match this filter."/></div>},{value:'tree',label:'Scene tree',content:<div className="showcase-grid"><div><TreeView nodes={treeNodes} defaultExpandedIds={['project','chapter-1']} defaultSelectedId={selectedNode} onSelect={setSelectedNode}/></div><div className="showcase-stack"><strong>Selected node</strong><code>{selectedNode}</code><p className="showcase-muted">Use arrow keys to navigate, left/right to collapse or expand, and Enter to select.</p></div></div>},{value:'details',label:'Details',content:<p className="showcase-muted">Tabs support controlled values, disabled items, horizontal or vertical orientation and manual activation.</p>}]}/></section>
 <footer>VSR Design System · Navigation and data components</footer></main>;
}
export default function App(){return <Showcase/>;}
