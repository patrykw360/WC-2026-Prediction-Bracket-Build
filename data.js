// ═══════════════════════════════════════════════════════════════
// MATCH DATA  —  all 104 matches. IDs match the database exactly.
// You should not need to edit this unless the schedule changes.
// ═══════════════════════════════════════════════════════════════

const GROUP_TEAMS = {
  A:['Mexico','South Africa','South Korea','Czechia'],
  B:['Canada','Bosnia-Herzegovina','Qatar','Switzerland'],
  C:['Brazil','Morocco','Haiti','Scotland'],
  D:['USA','Paraguay','Australia','Turkiye'],
  E:['Germany','Curacao','Ivory Coast','Ecuador'],
  F:['Netherlands','Japan','Sweden','Tunisia'],
  G:['Belgium','Egypt','Iran','New Zealand'],
  H:['Spain','Cape Verde','Saudi Arabia','Uruguay'],
  I:['France','Senegal','Iraq','Norway'],
  J:['Argentina','Algeria','Austria','Jordan'],
  K:['Portugal','DR Congo','Uzbekistan','Colombia'],
  L:['England','Croatia','Ghana','Panama']
};

// Group matches – id must match the database exactly (e.g. 'GA_11')
// kickoff in UTC ISO string – used only for client-side lock check
const GROUP_MATCHES = [
  // Group A
  {id:'GA_11',g:'A',a:'Mexico',b:'South Africa',ko:'2026-06-11T19:00:00Z',s:1},
  {id:'GA_12',g:'A',a:'South Korea',b:'Czechia',ko:'2026-06-12T02:00:00Z',s:2},
  {id:'GA_21',g:'A',a:'Mexico',b:'South Korea',ko:'2026-06-18T01:00:00Z',s:3},
  {id:'GA_22',g:'A',a:'Czechia',b:'South Africa',ko:'2026-06-18T16:00:00Z',s:4},
  {id:'GA_31',g:'A',a:'Mexico',b:'Czechia',ko:'2026-06-25T01:00:00Z',s:5},
  {id:'GA_32',g:'A',a:'South Korea',b:'South Africa',ko:'2026-06-25T01:00:00Z',s:6},
  // Group B
  {id:'GB_11',g:'B',a:'Canada',b:'Bosnia-Herzegovina',ko:'2026-06-12T19:00:00Z',s:7},
  {id:'GB_12',g:'B',a:'Switzerland',b:'Qatar',ko:'2026-06-13T19:00:00Z',s:8},
  {id:'GB_21',g:'B',a:'Canada',b:'Switzerland',ko:'2026-06-18T19:00:00Z',s:9},
  {id:'GB_22',g:'B',a:'Qatar',b:'Bosnia-Herzegovina',ko:'2026-06-18T22:00:00Z',s:10},
  {id:'GB_31',g:'B',a:'Switzerland',b:'Bosnia-Herzegovina',ko:'2026-06-24T19:00:00Z',s:11},
  {id:'GB_32',g:'B',a:'Canada',b:'Qatar',ko:'2026-06-24T19:00:00Z',s:12},
  // Group C
  {id:'GC_11',g:'C',a:'Brazil',b:'Morocco',ko:'2026-06-13T22:00:00Z',s:13},
  {id:'GC_12',g:'C',a:'Haiti',b:'Scotland',ko:'2026-06-14T01:00:00Z',s:14},
  {id:'GC_21',g:'C',a:'Scotland',b:'Morocco',ko:'2026-06-19T22:00:00Z',s:15},
  {id:'GC_22',g:'C',a:'Brazil',b:'Haiti',ko:'2026-06-20T00:30:00Z',s:16},
  {id:'GC_31',g:'C',a:'Scotland',b:'Brazil',ko:'2026-06-24T22:00:00Z',s:17},
  {id:'GC_32',g:'C',a:'Morocco',b:'Haiti',ko:'2026-06-24T22:00:00Z',s:18},
  // Group D
  {id:'GD_11',g:'D',a:'USA',b:'Paraguay',ko:'2026-06-13T01:00:00Z',s:19},
  {id:'GD_12',g:'D',a:'Australia',b:'Turkiye',ko:'2026-06-14T04:00:00Z',s:20},
  {id:'GD_21',g:'D',a:'USA',b:'Australia',ko:'2026-06-19T19:00:00Z',s:21},
  {id:'GD_22',g:'D',a:'Turkiye',b:'Paraguay',ko:'2026-06-20T03:00:00Z',s:22},
  {id:'GD_31',g:'D',a:'Turkiye',b:'USA',ko:'2026-06-26T02:00:00Z',s:23},
  {id:'GD_32',g:'D',a:'Paraguay',b:'Australia',ko:'2026-06-26T02:00:00Z',s:24},
  // Group E
  {id:'GE_11',g:'E',a:'Germany',b:'Curacao',ko:'2026-06-14T17:00:00Z',s:25},
  {id:'GE_12',g:'E',a:'Ivory Coast',b:'Ecuador',ko:'2026-06-14T23:00:00Z',s:26},
  {id:'GE_21',g:'E',a:'Germany',b:'Ivory Coast',ko:'2026-06-20T20:00:00Z',s:27},
  {id:'GE_22',g:'E',a:'Ecuador',b:'Curacao',ko:'2026-06-21T00:00:00Z',s:28},
  {id:'GE_31',g:'E',a:'Curacao',b:'Ivory Coast',ko:'2026-06-25T20:00:00Z',s:29},
  {id:'GE_32',g:'E',a:'Ecuador',b:'Germany',ko:'2026-06-25T20:00:00Z',s:30},
  // Group F
  {id:'GF_11',g:'F',a:'Netherlands',b:'Japan',ko:'2026-06-14T20:00:00Z',s:31},
  {id:'GF_12',g:'F',a:'Sweden',b:'Tunisia',ko:'2026-06-15T02:00:00Z',s:32},
  {id:'GF_21',g:'F',a:'Netherlands',b:'Sweden',ko:'2026-06-20T17:00:00Z',s:33},
  {id:'GF_22',g:'F',a:'Tunisia',b:'Japan',ko:'2026-06-21T04:00:00Z',s:34},
  {id:'GF_31',g:'F',a:'Japan',b:'Sweden',ko:'2026-06-25T23:00:00Z',s:35},
  {id:'GF_32',g:'F',a:'Tunisia',b:'Netherlands',ko:'2026-06-25T23:00:00Z',s:36},
  // Group G
  {id:'GG_11',g:'G',a:'Belgium',b:'Egypt',ko:'2026-06-15T19:00:00Z',s:37},
  {id:'GG_12',g:'G',a:'Iran',b:'New Zealand',ko:'2026-06-16T01:00:00Z',s:38},
  {id:'GG_21',g:'G',a:'Belgium',b:'Iran',ko:'2026-06-21T19:00:00Z',s:39},
  {id:'GG_22',g:'G',a:'New Zealand',b:'Egypt',ko:'2026-06-22T01:00:00Z',s:40},
  {id:'GG_31',g:'G',a:'Egypt',b:'Iran',ko:'2026-06-27T03:00:00Z',s:41},
  {id:'GG_32',g:'G',a:'New Zealand',b:'Belgium',ko:'2026-06-27T03:00:00Z',s:42},
  // Group H
  {id:'GH_11',g:'H',a:'Spain',b:'Cape Verde',ko:'2026-06-15T16:00:00Z',s:43},
  {id:'GH_12',g:'H',a:'Saudi Arabia',b:'Uruguay',ko:'2026-06-15T22:00:00Z',s:44},
  {id:'GH_21',g:'H',a:'Spain',b:'Saudi Arabia',ko:'2026-06-21T16:00:00Z',s:45},
  {id:'GH_22',g:'H',a:'Uruguay',b:'Cape Verde',ko:'2026-06-21T22:00:00Z',s:46},
  {id:'GH_31',g:'H',a:'Cape Verde',b:'Saudi Arabia',ko:'2026-06-27T00:00:00Z',s:47},
  {id:'GH_32',g:'H',a:'Uruguay',b:'Spain',ko:'2026-06-27T00:00:00Z',s:48},
  // Group I
  {id:'GI_11',g:'I',a:'France',b:'Senegal',ko:'2026-06-16T19:00:00Z',s:49},
  {id:'GI_12',g:'I',a:'Iraq',b:'Norway',ko:'2026-06-16T22:00:00Z',s:50},
  {id:'GI_21',g:'I',a:'France',b:'Iraq',ko:'2026-06-22T21:00:00Z',s:51},
  {id:'GI_22',g:'I',a:'Norway',b:'Senegal',ko:'2026-06-23T00:00:00Z',s:52},
  {id:'GI_31',g:'I',a:'Norway',b:'France',ko:'2026-06-26T19:00:00Z',s:53},
  {id:'GI_32',g:'I',a:'Senegal',b:'Iraq',ko:'2026-06-26T19:00:00Z',s:54},
  // Group J
  {id:'GJ_11',g:'J',a:'Argentina',b:'Algeria',ko:'2026-06-17T01:00:00Z',s:55},
  {id:'GJ_12',g:'J',a:'Austria',b:'Jordan',ko:'2026-06-17T04:00:00Z',s:56},
  {id:'GJ_21',g:'J',a:'Argentina',b:'Austria',ko:'2026-06-22T17:00:00Z',s:57},
  {id:'GJ_22',g:'J',a:'Jordan',b:'Algeria',ko:'2026-06-23T03:00:00Z',s:58},
  {id:'GJ_31',g:'J',a:'Algeria',b:'Austria',ko:'2026-06-28T02:00:00Z',s:59},
  {id:'GJ_32',g:'J',a:'Jordan',b:'Argentina',ko:'2026-06-28T02:00:00Z',s:60},
  // Group K
  {id:'GK_11',g:'K',a:'Portugal',b:'DR Congo',ko:'2026-06-17T17:00:00Z',s:61},
  {id:'GK_12',g:'K',a:'Uzbekistan',b:'Colombia',ko:'2026-06-18T02:00:00Z',s:62},
  {id:'GK_21',g:'K',a:'Portugal',b:'Uzbekistan',ko:'2026-06-23T17:00:00Z',s:63},
  {id:'GK_22',g:'K',a:'Colombia',b:'DR Congo',ko:'2026-06-24T02:00:00Z',s:64},
  {id:'GK_31',g:'K',a:'Colombia',b:'Portugal',ko:'2026-06-27T23:30:00Z',s:65},
  {id:'GK_32',g:'K',a:'DR Congo',b:'Uzbekistan',ko:'2026-06-27T23:30:00Z',s:66},
  // Group L
  {id:'GL_11',g:'L',a:'England',b:'Croatia',ko:'2026-06-17T20:00:00Z',s:67},
  {id:'GL_12',g:'L',a:'Ghana',b:'Panama',ko:'2026-06-17T23:00:00Z',s:68},
  {id:'GL_21',g:'L',a:'England',b:'Ghana',ko:'2026-06-23T20:00:00Z',s:69},
  {id:'GL_22',g:'L',a:'Panama',b:'Croatia',ko:'2026-06-23T23:00:00Z',s:70},
  {id:'GL_31',g:'L',a:'Panama',b:'England',ko:'2026-06-27T21:00:00Z',s:71},
  {id:'GL_32',g:'L',a:'Croatia',b:'Ghana',ko:'2026-06-27T21:00:00Z',s:72}
];

const KO_MATCHES = [
  // Round of 32
  {id:'R32_01',stage:'r32',a:'Runner-up A',b:'Runner-up B',ko:'2026-06-28T19:00:00Z',s:101},
  {id:'R32_02',stage:'r32',a:'Winner E',b:'Best 3rd A/B/C/D/F',ko:'2026-06-29T20:30:00Z',s:102},
  {id:'R32_03',stage:'r32',a:'Winner F',b:'Runner-up C',ko:'2026-06-30T01:00:00Z',s:103},
  {id:'R32_04',stage:'r32',a:'Winner C',b:'Runner-up F',ko:'2026-06-29T17:00:00Z',s:104},
  {id:'R32_05',stage:'r32',a:'Winner I',b:'Best 3rd C/D/F/G/H',ko:'2026-06-30T21:00:00Z',s:105},
  {id:'R32_06',stage:'r32',a:'Runner-up E',b:'Runner-up I',ko:'2026-06-30T17:00:00Z',s:106},
  {id:'R32_07',stage:'r32',a:'Winner A',b:'Best 3rd C/E/F/H/I',ko:'2026-07-01T01:00:00Z',s:107},
  {id:'R32_08',stage:'r32',a:'Winner L',b:'Best 3rd E/H/I/J/K',ko:'2026-07-01T16:00:00Z',s:108},
  {id:'R32_09',stage:'r32',a:'Winner D',b:'Best 3rd B/E/F/I/J',ko:'2026-07-02T00:00:00Z',s:109},
  {id:'R32_10',stage:'r32',a:'Winner G',b:'Best 3rd A/E/H/I/J',ko:'2026-07-01T20:00:00Z',s:110},
  {id:'R32_11',stage:'r32',a:'Runner-up K',b:'Runner-up L',ko:'2026-07-02T23:00:00Z',s:111},
  {id:'R32_12',stage:'r32',a:'Winner H',b:'Runner-up J',ko:'2026-07-02T19:00:00Z',s:112},
  {id:'R32_13',stage:'r32',a:'Winner B',b:'Best 3rd E/F/G/I/J',ko:'2026-07-03T03:00:00Z',s:113},
  {id:'R32_14',stage:'r32',a:'Winner J',b:'Runner-up H',ko:'2026-07-03T22:00:00Z',s:114},
  {id:'R32_15',stage:'r32',a:'Winner K',b:'Best 3rd D/E/I/J/L',ko:'2026-07-04T01:30:00Z',s:115},
  {id:'R32_16',stage:'r32',a:'Runner-up D',b:'Runner-up G',ko:'2026-07-03T18:00:00Z',s:116},
  // Round of 16
  {id:'R16_01',stage:'r16',a:'W R32_02',b:'W R32_05',ko:'2026-07-04T21:00:00Z',s:117},
  {id:'R16_02',stage:'r16',a:'W R32_01',b:'W R32_03',ko:'2026-07-04T17:00:00Z',s:118},
  {id:'R16_03',stage:'r16',a:'W R32_04',b:'W R32_06',ko:'2026-07-05T20:00:00Z',s:119},
  {id:'R16_04',stage:'r16',a:'W R32_07',b:'W R32_08',ko:'2026-07-06T00:00:00Z',s:120},
  {id:'R16_05',stage:'r16',a:'W R32_11',b:'W R32_12',ko:'2026-07-06T19:00:00Z',s:121},
  {id:'R16_06',stage:'r16',a:'W R32_09',b:'W R32_10',ko:'2026-07-07T00:00:00Z',s:122},
  {id:'R16_07',stage:'r16',a:'W R32_14',b:'W R32_16',ko:'2026-07-07T16:00:00Z',s:123},
  {id:'R16_08',stage:'r16',a:'W R32_13',b:'W R32_15',ko:'2026-07-07T20:00:00Z',s:124},
  // Quarter-finals
  {id:'QF_01',stage:'qf',a:'W R16_01',b:'W R16_02',ko:'2026-07-09T20:00:00Z',s:125},
  {id:'QF_02',stage:'qf',a:'W R16_05',b:'W R16_06',ko:'2026-07-10T19:00:00Z',s:126},
  {id:'QF_03',stage:'qf',a:'W R16_03',b:'W R16_04',ko:'2026-07-11T21:00:00Z',s:127},
  {id:'QF_04',stage:'qf',a:'W R16_07',b:'W R16_08',ko:'2026-07-12T01:00:00Z',s:128},
  // Semi-finals
  {id:'SF_01',stage:'sf',a:'W QF_01',b:'W QF_02',ko:'2026-07-14T19:00:00Z',s:129},
  {id:'SF_02',stage:'sf',a:'W QF_03',b:'W QF_04',ko:'2026-07-15T19:00:00Z',s:130},
  // Third place
  {id:'3P_01',stage:'3rd',a:'L SF_01',b:'L SF_02',ko:'2026-07-18T21:00:00Z',s:131},
  // Final
  {id:'FIN_01',stage:'final',a:'W SF_01',b:'W SF_02',ko:'2026-07-19T19:00:00Z',s:132}
];

const STAGE_LABELS = {r32:'Round of 32',r16:'Round of 16',qf:'Quarter-finals',sf:'Semi-finals','3rd':'Third-Place Match',final:'Final'};
const STAGE_DATES  = {r32:'Jun 28 – Jul 3',r16:'Jul 4 – Jul 7',qf:'Jul 9 – Jul 11',sf:'Jul 14 – Jul 15','3rd':'Jul 18 · Miami',final:'Jul 19 · MetLife Stadium'};
