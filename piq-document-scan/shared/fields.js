/**
 * PIQ field model.
 *
 * The cleaned-up Property Information Questionnaire as data. Every question is
 * one "fact" with a key (k), the original PIQ question number (src), the options
 * it accepts (o) and the condition under which it is asked (when).
 *
 * Shared by the browser (to show answers) and the server (to build the prompt).
 */
/* ---------- Option sets ---------- */
export const DK = 'Don’t know', NR = 'Not required';
export const YND = ['Yes','No',DK], YN = ['Yes','No'], YNR = ['Yes','No',NR], YNL = ['Yes','No','Lost'];
export const PARKING = ['Garage','Double garage','Triple garage','Garage en bloc','Driveway','Off-road parking','Carport','Allocated space','Residents’ parking','Communal parking','Permit parking','Street parking','Secure gated parking','Covered parking','Private parking','Rear parking','EV charging','Disabled parking','No parking'];

/* ---------- Conditions ---------- */
export const W = (text, fn) => ({ text, fn });
export const isYes = k => a => a[k] === 'Yes';
export const anyIs = (ks, vals) => a => ks.some(k => vals.includes(a[k]));

export const K = {
  alterations:['has_structural_alterations','has_replacement_windows','has_conservatory'],
  damp:['damp_preventative','damp_treatment'],
  conditionYes:['damp_preventative','damp_treatment','subsidence'],
  pipes:['pipes_cross_neighbour','neighbour_pipes_cross','pipes_agreement'],
  insurance:['ins_premium_rise','ins_high_excess','ins_unusual_conditions','ins_refused'],
  boundary:['not_in_ownership','boundary_application','boundary_moved','land_sold_bought','overhang','party_wall_notice'],
  rights:['shared_costs','rights_over_neighbours','access_prevented','public_right_of_way','right_light','right_support','customary_rights','mines_minerals','chancel_repair','profit_rights','other_rights'],
  disputes:['has_disputes','potential_disputes'],
  notices:['notice_neighbour_development','notice_planning_application','notice_repairs','notice_listed_application','notice_infrastructure','notice_other'],
  env:['env_issues','env_noise','env_crime','env_air']
};

export const C = {
  notExempt: W('the property isn’t exempt from council tax', a => a.council_tax_exempt === 'No'),
  lease: W('the tenure is Leasehold or Share of Freehold', a => a.tenure === 'Leasehold' || a.tenure === 'Share of Freehold'),
  capOther: W('the capacity is “Other”', a => a.sale_capacity === 'Other'),
  convKnown: W('a conveyancer has been chosen', isYes('conveyancer_known')),
  occupiers: W('someone over 17 other than the owner lives there', isYes('occupiers_over_17')),
  charges: W('there are other charges', isYes('has_other_charges')),
  restrictions: W('there are restrictions on the property', isYes('has_restrictions')),
  greenDeal: W('there is a financed improvement scheme', isYes('green_deal_loan')),
  tpo: W('a tree preservation order applies', isYes('has_tpo')),
  structural: W('there were structural alterations', isYes('has_structural_alterations')),
  windows: W('windows or doors were replaced since 2002', isYes('has_replacement_windows')),
  conservatory: W('a conservatory was added', isYes('has_conservatory')),
  listed: W('the property is listed', isYes('is_listed')),
  cladding: W('the property has cladding', isYes('has_cladding')),
  compliance: W('there are consent or compliance issues', isYes('has_compliance_issues')),
  invasive: W('an invasive species is present', isYes('invasive_species')),
  knotweedPlan: W('a plan is in place', isYes('knotweed_plan')),
  conditionDetails: W('damp, rot or subsidence is “Yes”, or the construction isn’t traditional', a => K.conditionYes.some(k => a[k] === 'Yes') || a.traditional_construction === 'No'),
  alarm: W('there is an alarm', isYes('smoke_co_alarm')),
  offMains: W('drainage isn’t to a public sewer', a => a.svc_drainage === 'No'),
  notCesspool: W('the system isn’t a cesspool', a => !!a.offmains_type && a.offmains_type !== 'Cesspool'),
  agreements: W('there are service agreements', isYes('service_agreements')),
  heating: W('there is central heating', isYes('central_heating')),
  post2005: W('it was installed in 2005 or later', a => Number(a.heating_installed_year) >= 2005),
  rewired: W('electrical work was done since 2005', isYes('rewired_since_2005')),
  pipes: W('a drains or pipes question is “Yes”', anyIs(K.pipes, ['Yes'])),
  dampWork: W('damp or rot work is “Yes” or “Don’t know”', anyIs(K.damp, ['Yes', DK])),
  glazing: W('replaced windows or a conservatory is “Yes” or “Don’t know”', anyIs(['has_replacement_windows','has_conservatory'], ['Yes', DK])),
  solar: W('solar panels are connected', a => a.svc_solar === 'Yes'),
  gOther: W('there is another guarantee', isYes('g_other')),
  insurance: W('an insurance question is “Yes”', anyIs(K.insurance, ['Yes'])),
  boundary: W('a boundary question is “Yes”', anyIs(K.boundary, ['Yes'])),
  rights: W('a rights question is “Yes”', anyIs(K.rights, ['Yes'])),
  disputes: W('a dispute question is “Yes”', anyIs(K.disputes, ['Yes'])),
  notices: W('a notice question is “Yes”', anyIs(K.notices, ['Yes'])),
  env: W('a surroundings question is “Yes”', anyIs(K.env, ['Yes'])),
  otherIssues: W('there are other issues', isYes('other_material_issues')),
  specialCompletion: W('there are date requirements', isYes('special_completion')),
  epcYes: W('an EPC is available', a => a.epc_available === 'Yes'),
  epcNo: W('there is no EPC', a => a.epc_available === 'No'),
  aml: W('there is no completed identity check for the seller', a => !a.aml_verified)
};

export const GUAR_ROWS = [
  { k:'g_nhbc', q:'New build warranty (NHBC or similar)', src:'B5.1' },
  { k:'g_roofing', q:'Roofing work', src:'B5.1' },
  { k:'g_damp', q:'Damp proofing', src:'B5.1', when:C.dampWork },
  { k:'g_timber', q:'Timber treatment', src:'B5.1', when:C.dampWork },
  { k:'g_heating', q:'Central heating or plumbing', src:'B5.1', when:C.heating },
  { k:'g_glazing', q:'Double glazing or conservatory', src:'B5.1', when:C.glazing },
  { k:'g_electrical', q:'Electrical work', src:'B5.1', when:C.rewired },
  { k:'g_solar', q:'Solar panels', src:'B5.1', when:C.solar },
  { k:'g_other', q:'Something else', src:'B5.1' }
];
C.anyGuarantee = W('at least one guarantee is “Yes”', a => GUAR_ROWS.some(r => a[r.k] === 'Yes' && (!r.when || r.when.fn(a))));

/* One alteration = one record with its own consents */
function alt(id, title, trigger, withDesc, hint) {
  const p = 'alt_' + id + '_';
  const consentKeys = a => ['building_regs','planning']
    .concat(a.is_listed === 'Yes' ? ['listed_consent'] : [])
    .concat(a.has_restrictions === 'Yes' ? ['title_consent'] : []);
  const items = [];
  if (withDesc) items.push({ t:'textarea', k:p+'description', q:'What was done?', hint:'For example a loft conversion, a removed wall or a garage conversion.', src:'new' });
  items.push({ t:'year', k:p+'year', q:'Roughly what year?', src:'new', w:'third' });
  items.push({ t:'radio', k:p+'building_regs', q:'Was Building Regulations approval and a completion certificate (or a Competent Person Scheme certificate) obtained?', o:YNR, src:'A3.5.1' });
  items.push({ t:'radio', k:p+'planning', q:'Was planning permission obtained?', o:YNR, src:'A3.5.2' });
  items.push({ t:'radio', k:p+'listed_consent', q:'Was listed building consent obtained?', o:YNR, src:'A3.5.3', when:C.listed });
  items.push({ t:'radio', k:p+'title_consent', q:'Was consent needed under a restriction in the title obtained?', o:YNR, src:'A3.5.4', when:C.restrictions });
  items.push({ t:'textarea', k:p+'missing_reason', q:'Why wasn’t it obtained?', src:'A3.5', when:W('a consent above is “No”', a => consentKeys(a).some(x => a[p+x] === 'No')) });
  items.push({ t:'file', k:p+'documents', q:'Upload the certificates and approvals', src:'A3.5', opt:true, when:W('a consent above is “Yes”', a => consentKeys(a).some(x => a[p+x] === 'Yes')) });
  items.push({ t:'radio', k:p+'unfinished', q:'Is any of this work unfinished?', o:YN, src:'A3.6' });
  return { t:'group', title, hint, when:trigger, items };
}

/* ---------- Sections ---------- */
export const SECTIONS = [
{ title:'The property', intro:'Lifesycle already holds these details from the listing, so they’re filled in for you. If you change one, your agent sees the change.', items:[
  { t:'text', k:'property_type', q:'Property type', src:'A1.1', w:'half' },
  { t:'money', k:'asking_price', q:'Asking price', src:'A1.1', w:'half' },
  { t:'number', k:'bedrooms', q:'Bedrooms', src:'A1.1', w:'third' },
  { t:'number', k:'bathrooms', q:'Bathrooms', src:'A1.1', w:'third' },
  { t:'number', k:'parking_spaces', q:'Parking spaces', src:'A1.1', w:'third' },
  { t:'text', k:'address', q:'Address', src:'A1.1' },
  { t:'multi', k:'parking', q:'What parking does the property have?', hint:'Choose all that apply.', o:PARKING, none:'No parking', src:'A1.5', note:'23 options in the original. “None” and “No parking available” are merged, and “No permit”, “Not allocated” and “No disabled parking” are removed: leaving an option unselected says the same thing.' },
  { t:'radio', k:'council_tax_exempt', q:'Is the property exempt from council tax?', o:YN, src:'B2' },
  { t:'radio', k:'council_tax_band', q:'Council tax band', o:['A','B','C','D','E','F','G','H'], src:'B2', when:C.notExempt, note:'Could be looked up from the public VOA register.' }
]},
{ title:'Ownership and tenure', intro:'Who owns the property, how it is held and who lives there.', items:[
  { t:'radio', k:'tenure', q:'How is the property held?', o:['Freehold','Leasehold','Share of Freehold','Commonhold','Flying Freehold','Feudal','Share Transfer','Not sure'], src:'A1.2', note:'This answer decides whether the lease questions appear.' },
  { t:'group', title:'Lease details', when:C.lease, items:[
    { t:'date', k:'lease_end_date', q:'Lease end date', src:'A1.3', w:'third' },
    { t:'money', k:'ground_rent', q:'Annual ground rent', src:'A1.3', w:'third' },
    { t:'percent', k:'ground_rent_increase', q:'Ground rent increase per year', src:'A1.3', w:'third' },
    { t:'money', k:'service_charge', q:'Current service charge', src:'A1.4', w:'third' },
    { t:'money', k:'sale_letting_fees', q:'Fees payable on sale or letting', src:'A1.4', w:'third' },
    { t:'text', k:'managing_agent', q:'Managing agent', src:'A1.4', w:'third' },
    { t:'text', k:'freeholder_name', q:'Freeholder’s name', src:'A1.4', w:'half' },
    { t:'text', k:'sinking_fund', q:'Sinking fund details', src:'A1.4', w:'half', opt:true }
  ]},
  { t:'list', k:'owners', q:'Legal owners', item:'Owner', add:'Add another owner', src:'B1.1', note:'Owner 1 is filled in from the Lifesycle contact.', fields:[
    { k:'first', q:'First name' }, { k:'last', q:'Surname' }, { k:'address', q:'Address' }, { k:'postcode', q:'Postcode' }
  ]},
  { t:'radio', k:'sale_capacity', q:'In what capacity are you selling?', o:['Legal owner','Personal representative of a deceased owner','Under power of attorney','Mortgagee in possession','Other'], src:'B1.3' },
  { t:'textarea', k:'sale_capacity_details', q:'Please explain', src:'new', when:C.capOther },
  { t:'radio', k:'conveyancer_known', q:'Have you chosen a conveyancer?', o:['Yes','Not yet'], src:'new' },
  { t:'group', title:'Your conveyancer', when:C.convKnown, items:[
    { t:'text', k:'conveyancer_name', q:'Name', src:'B1.2', w:'half' },
    { t:'text', k:'conveyancer_reference', q:'Reference', src:'B1.2', w:'half', opt:true },
    { t:'text', k:'conveyancer_address', q:'Address', src:'B1.2', w:'half' },
    { t:'text', k:'conveyancer_postcode', q:'Postcode', src:'B1.2', w:'half' }
  ]},
  { t:'radio', k:'occupiers_over_17', q:'Does anyone aged over 17, other than the owner, live at the property?', o:YN, src:'B8.1' },
  { t:'radio', k:'occupiers_will_vacate', q:'Have they all agreed to sign the contract and leave before completion?', o:YN, src:'B8.2', when:C.occupiers }
]},
{ title:'Charges and restrictions', intro:'Costs and rules that come with the property.', items:[
  { t:'radio', k:'has_other_charges', q:'Apart from any lease, do you pay estate charges, a rentcharge or other maintenance charges?', o:YND, src:'A1.4, A11.7', note:'Asked twice in the original.' },
  { t:'textarea', k:'other_charges_details', q:'Who do you pay, how much and how often?', src:'A1.4', when:C.charges },
  { t:'radio', k:'has_restrictions', q:'Are there restrictions on how the property can be used or altered, from the lease, the title or otherwise?', o:YND, src:'A1.4', note:'Used later: the title consent question for each alteration only appears if this is “Yes”.' },
  { t:'textarea', k:'restrictions_details', q:'What are the restrictions?', src:'new', when:C.restrictions },
  { t:'radio', k:'green_deal_loan', q:'Is there a Green Deal loan or another financed home improvement scheme?', o:YND, src:'A11.4' },
  { t:'textarea', k:'green_deal_details', q:'Give details', src:'new', when:C.greenDeal }
]},
{ title:'Listing and protection', intro:'Designations that limit what can be changed. All three can be checked against public records.', items:[
  { t:'matrix', q:'Does any of the following apply?', o:YND, rows:[
    { k:'is_listed', q:'The property is a listed building', src:'A1.6.1' },
    { k:'in_conservation_area', q:'It is in a conservation area', src:'A1.6.2' },
    { k:'has_tpo', q:'A tree on the property has a tree preservation order', src:'A1.6.3' }
  ]},
  { t:'radio', k:'tpo_complied', q:'Have the terms of the order been complied with?', o:YND, src:'A1.6.4', when:C.tpo }
]},
{ title:'Alterations', intro:'Changes made to the property. Consents are asked for each change separately, not once for everything.', items:[
  { t:'matrix', q:'Has the property had any of the following?', o:YND, rows:[
    { k:'has_structural_alterations', q:'Structural alterations, extensions or significant repairs', hint:'For example a loft or garage conversion, removed walls or chimneys, or a change of use.', src:'A3.1' },
    { k:'has_replacement_windows', q:'Replacement windows, roof windows, roof lights or glazed doors since 1 April 2002', src:'A3.2' },
    { k:'has_conservatory', q:'A conservatory', src:'A3.4' }
  ]},
  alt('structural', 'Structural alterations', C.structural, true),
  alt('windows', 'Replacement windows and doors', C.windows, false, 'A FENSA certificate counts as a Competent Person Scheme certificate.'),
  alt('conservatory', 'Conservatory', C.conservatory, false),
  { t:'radio', k:'has_cladding', q:'Does the property have cladding?', o:YND, src:'A3.3.1' },
  { t:'group', title:'Cladding', when:C.cladding, items:[
    { t:'text', k:'cladding_type', q:'What type of cladding is it?', src:'A3.3.3' },
    { t:'radio', k:'ews1_completed', q:'Has an EWS1 form been completed?', hint:'Mainly relevant for blocks of flats.', o:YND, src:'A3.3.2' }
  ]},
  { t:'radio', k:'has_compliance_issues', q:'Do you know of any work without the right consents, breached planning or Building Regulations conditions, or restrictions that weren’t followed?', o:YND, src:'A3.7, A3.8, A12.1', note:'Three overlapping questions in the original.' },
  { t:'textarea', k:'compliance_details', q:'Give details', src:'new', when:C.compliance }
]},
{ title:'Condition', intro:'Known problems and how the property is built.', items:[
  { t:'matrix', q:'Has the property ever had or been affected by any of the following?', o:YND, rows:[
    { k:'damp_preventative', q:'Preventative work for dry rot, wet rot or damp', src:'A5.1' },
    { k:'damp_treatment', q:'Treatment for dry rot, wet rot or damp', src:'A5.2' },
    { k:'invasive_species', q:'Japanese knotweed or another invasive species', src:'A5.3' },
    { k:'subsidence', q:'Subsidence or a structural fault', src:'A5.4' },
    { k:'asbestos', q:'Asbestos', src:'A11.8' }
  ]},
  { t:'group', title:'Invasive species', when:C.invasive, items:[
    { t:'radio', k:'knotweed_plan', q:'Is there a management plan in place?', o:YN, src:'A5.3' },
    { t:'file', k:'knotweed_plan_file', q:'Upload the management plan', src:'A5.3', opt:true, when:C.knotweedPlan }
  ]},
  { t:'radio', k:'traditional_construction', q:'Is the property of traditional construction?', hint:'Brick or stone walls with a slate or tiled roof.', o:YND, src:'A5.5', note:'Wall and roof type are also recorded in the EPC.' },
  { t:'textarea', k:'condition_details', q:'Give details', src:'A5', when:C.conditionDetails },
  { t:'radio', k:'smoke_co_alarm', q:'Is there a smoke or carbon monoxide alarm?', o:YND, src:'A11.9' },
  { t:'text', k:'alarm_type', q:'What type of alarm?', hint:'For example a mains-wired smoke alarm or a battery CO alarm.', src:'A11.9', when:C.alarm }
]},
{ title:'Services and heating', intro:'What is connected, how it is maintained, and anything that crosses a boundary.', items:[
  { t:'services', q:'Which services are connected?', hint:'Add the supplier for anything that is connected.', src:'A7.1', rows:[
    { k:'electricity', q:'Electricity' }, { k:'gas', q:'Mains gas' }, { k:'lpg', q:'LPG (bottled or tank gas)' },
    { k:'water', q:'Mains water' }, { k:'drainage', q:'Drainage to a public sewer' }, { k:'phone', q:'Telephone' },
    { k:'tv', q:'Cable or satellite TV' }, { k:'broadband', q:'Broadband' },
    { k:'solar', q:'Solar panels', src:'A7.1, B4.4', note:'Also asked in B4.4. The solar guarantee question only appears if this is “Yes”.' }
  ]},
  { t:'group', title:'Private drainage', hint:'The property isn’t on a public sewer, so it has its own system.', when:C.offMains, items:[
    { t:'radio', k:'offmains_type', q:'What type of system is it?', o:['Septic tank','Cesspool','Sewage treatment plant'], src:'A7.1' },
    { t:'date', k:'offmains_last_emptied', q:'When was it last emptied?', src:'A7.1', w:'half' },
    { t:'radio', k:'offmains_shared', q:'Is it shared with other properties?', o:YN, src:'A7.1' },
    { t:'radio', k:'offmains_others_land', q:'Is any part of it on someone else’s land?', o:YN, src:'A7.1' },
    { t:'radio', k:'offmains_compliant', q:'Does it meet BS EN 12566-3?', hint:'The standard for small sewage treatment systems. Your maintenance company can usually confirm.', o:YND, src:'A7.1', when:C.notCesspool }
  ]},
  { t:'radio', k:'service_agreements', q:'Do you have maintenance agreements, contracts or licences for any of these services?', o:YN, src:'A7.2' },
  { t:'textarea', k:'service_agreements_details', q:'Which ones?', src:'new', when:C.agreements },
  { t:'radio', k:'central_heating', q:'Is there central or partial central heating?', o:YN, src:'A7.3' },
  { t:'group', title:'Central heating', when:C.heating, items:[
    { t:'year', k:'heating_installed_year', q:'What year was it installed?', src:'A7.4', w:'half' },
    { t:'date', k:'heating_last_serviced', q:'When was it last serviced?', src:'A7.5', w:'half' },
    { t:'file', k:'gas_safe_certificate', q:'Upload the Gas Safe installation certificate', src:'A7.4', opt:true, when:C.post2005 },
    { t:'file', k:'heating_service_report', q:'Upload the last service report', src:'A7.5', opt:true },
    { t:'radio', k:'heating_working', q:'Is the heating in good working order?', o:YN, src:'A7.6' }
  ]},
  { t:'matrix', q:'Electrical installation', o:YN, rows:[
    { k:'electrical_tested', q:'Has any of it been tested by a registered electrician?', src:'B7.1' },
    { k:'rewired_since_2005', q:'Has it been rewired or had electrical work since 1 January 2005?', src:'B7.2' }
  ]},
  { t:'file', k:'electrical_certificate', q:'Upload the Building Regulations completion certificate for the electrical work', src:'B7.2', opt:true, when:C.rewired },
  { t:'matrix', q:'Drains, pipes and wires', o:YND, rows:[
    { k:'pipes_cross_neighbour', q:'Do any serving this property cross a neighbour’s property?', src:'B4.1' },
    { k:'neighbour_pipes_cross', q:'Do any serving a neighbour cross this property?', src:'B4.2' },
    { k:'pipes_agreement', q:'Is there an agreement about them?', src:'B4.3' }
  ]},
  { t:'textarea', k:'pipes_details', q:'Give details', src:'B4.3', when:C.pipes },
  { t:'file', k:'pipes_documents', q:'Upload any agreements', src:'B4.3', opt:true, when:C.pipes }
]},
{ title:'Guarantees', intro:'Only guarantees for work you’ve already told us about are listed.', items:[
  { t:'matrix', q:'Is there a guarantee or warranty for…', mq:'Guarantee', o:YNL, rows:GUAR_ROWS },
  { t:'text', k:'g_other_details', q:'What is the other guarantee for?', src:'new', when:C.gOther },
  { t:'radio', k:'guarantee_paperwork', q:'Will you leave all guarantee paperwork at the property?', o:YN, src:'B5.1', when:C.anyGuarantee },
  { t:'radio', k:'guarantee_claims', q:'Are there any outstanding claims under these guarantees?', o:YND, src:'B5.2', when:C.anyGuarantee }
]},
{ title:'Insurance', items:[
  { t:'radio', k:'insures_property', q:'Do you insure the property?', o:YN, src:'A8.2', note:'Moved to the start of the section.' },
  { t:'matrix', q:'Has buildings insurance on the property ever been…', mq:'Insurance has been', o:YN, rows:[
    { k:'ins_premium_rise', q:'Subject to an abnormal rise in premium', src:'A8.1' },
    { k:'ins_high_excess', q:'Subject to high excesses', src:'A8.1' },
    { k:'ins_unusual_conditions', q:'Subject to unusual conditions', src:'A8.1' },
    { k:'ins_refused', q:'Refused', src:'A8.1' }
  ]},
  { t:'textarea', k:'insurance_details', q:'Give details', src:'A8.1', when:C.insurance }
]},
{ title:'Boundaries and rights', intro:'Part A section 9 and Part B section 3 both asked about boundaries. They are combined here.', items:[
  { t:'matrix', q:'Looking at the property from the road, who looks after each boundary?', mq:'Who maintains the boundary', o:['Seller','Shared','Neighbour','Not known'], rows:[
    { k:'boundary_left', q:'Left', src:'B3.1' }, { k:'boundary_right', q:'Right', src:'B3.1' },
    { k:'boundary_rear', q:'Rear', src:'B3.1' }, { k:'boundary_front', q:'Front', src:'B3.1' }
  ]},
  { t:'textarea', k:'boundary_irregular', q:'If the boundaries are irregular, describe them', src:'B3.2', opt:true },
  { t:'matrix', q:'Boundary changes', o:YND, rows:[
    { k:'not_in_ownership', q:'Is any part of the property outside your legal ownership?', src:'A9.1' },
    { k:'boundary_application', q:'Is there a current application to change the boundaries?', src:'A9.2' },
    { k:'boundary_moved', q:'Has a boundary feature been moved in the last 20 years?', src:'B3.3' },
    { k:'land_sold_bought', q:'While you’ve owned it, has any land been sold off or neighbouring land bought?', src:'B3.4' },
    { k:'overhang', q:'Does any part of the property overhang or project under a neighbour’s property or the road?', src:'B3.5' },
    { k:'party_wall_notice', q:'Have you received a notice under the Party Wall Act 1996?', src:'B3.6' }
  ]},
  { t:'textarea', k:'boundary_details', q:'Give details', src:'new', when:C.boundary },
  { t:'matrix', q:'Rights and shared arrangements', o:YND, rows:[
    { k:'shared_costs', q:'Do you share the cost of anything used jointly, such as a private road, driveway or drain?', src:'A10.1' },
    { k:'rights_over_neighbours', q:'Does the property have rights over neighbouring land, such as access for maintenance or parking?', src:'A10.2' },
    { k:'access_prevented', q:'Has anyone blocked access, complained about it or asked to be paid for it?', src:'A10.3' },
    { k:'public_right_of_way', q:'Is there a public right of way across the property?', src:'A10.4' },
    { k:'right_light', q:'Right of light', hint:'A right to keep receiving daylight through a window, which can stop building nearby.', src:'A10.5' },
    { k:'right_support', q:'Right of support from adjoining properties', src:'A10.5' },
    { k:'customary_rights', q:'Customary rights', hint:'Rights that come from local tradition.', src:'A10.5' },
    { k:'mines_minerals', q:'Other people’s rights to mines and minerals under the land', src:'A10.5' },
    { k:'chancel_repair', q:'Chancel repair liability', hint:'An old liability that can make some owners pay toward repairing a parish church.', src:'A10.5' },
    { k:'profit_rights', q:'Other people’s rights to take things from the land, such as timber, hay or fish', src:'A10.5' },
    { k:'other_rights', q:'Any other rights or arrangements', src:'A10.5' }
  ]},
  { t:'textarea', k:'rights_details', q:'Give details', src:'A10.5', when:C.rights }
]},
{ title:'Disputes, notices and surroundings', intro:'Anything nearby that a buyer should know about.', items:[
  { t:'matrix', q:'Disputes and complaints', o:YND, rows:[
    { k:'has_disputes', q:'Have there been disputes or complaints about this property or one nearby?', src:'A2.1' },
    { k:'potential_disputes', q:'Is there anything that could lead to one?', src:'A2.2' }
  ]},
  { t:'textarea', k:'dispute_details', q:'Give details', src:'new', when:C.disputes, note:'The original has no space for details here.' },
  { t:'matrix', q:'Are you aware of, or have you received, any of the following?', o:YND, rows:[
    { k:'notice_neighbour_development', q:'A neighbour plans to develop land or alter buildings nearby', src:'A4.1' },
    { k:'notice_planning_application', q:'A planning application that could affect the property or its views', src:'A4.2' },
    { k:'notice_repairs', q:'A notice that maintenance or repairs are required', src:'A4.3' },
    { k:'notice_listed_application', q:'A listed building application', src:'A4.4' },
    { k:'notice_infrastructure', q:'An infrastructure project, such as a wind turbine, railway or fracking', src:'A4.5' },
    { k:'notice_other', q:'Any other relevant or legal notice', src:'A4.6' }
  ]},
  { t:'textarea', k:'notice_details', q:'Give details', src:'A4.7', when:C.notices, note:'The original only tells you to pass details to your conveyancer.' },
  { t:'matrix', q:'Does any of the following affect the property?', o:YND, rows:[
    { k:'env_issues', q:'Flooding, radon, mining, quarrying or fracking in the last 5 years', hint:'Risk levels could be filled in from public maps. You confirm what actually happened.', src:'A11.1' },
    { k:'env_noise', q:'Excessive noise or disturbance', src:'A11.2' },
    { k:'env_crime', q:'Crime or burglary a buyer should know about', src:'A11.3' },
    { k:'env_air', q:'Air pollution', src:'A11.5' }
  ]},
  { t:'textarea', k:'env_details', q:'Give details', src:'A11', when:C.env },
  { t:'radio', k:'failed_transactions', q:'Has a sale of the property fallen through in the last 12 months?', o:YND, src:'A11.6', note:'Lifesycle may already know this.' },
  { t:'radio', k:'other_material_issues', q:'Is there anything else that might affect a buyer’s decision?', o:YND, src:'A12.2' },
  { t:'textarea', k:'other_issues_details', q:'Give details', src:'new', when:C.otherIssues }
]},
{ title:'What’s included', intro:'A final list is agreed with your conveyancer once a sale is agreed.', items:[
  { t:'textarea', k:'fixtures_taking', q:'Which fixtures or fittings do you plan to take?', hint:'For example carpets, curtains, light fittings or fitted cupboards.', src:'A6.1' },
  { t:'textarea', k:'contents_included', q:'What furniture or belongings will you include in the sale?', src:'A6.2' },
  { t:'textarea', k:'selling_points', q:'What are the five best things about the property?', src:'A1 page D' },
  { t:'textarea', k:'improvement_potential', q:'Why is it a great place to live, and what potential does it have for improvements or extensions?', src:'A1 page D' }
]},
{ title:'Moving out', items:[
  { t:'radio', k:'dependent_on_purchase', q:'Does your sale depend on completing a purchase on the same day?', o:YN, src:'B9.1' },
  { t:'radio', k:'special_completion', q:'Do you have any requirements about the completion or moving date?', o:YN, src:'B9.2' },
  { t:'textarea', k:'completion_details', q:'What are they?', src:'new', when:C.specialCompletion },
  { t:'matrix', q:'On completion, will you…', mq:'On completion', o:YN, rows:[
    { k:'rubbish_removed', q:'Remove all rubbish, including from the loft, garden and outbuildings, and leave the property clean', src:'B9.3' },
    { k:'light_fittings_replaced', q:'Replace any removed light fittings with a ceiling rose, flex, bulb holder and bulb', src:'B9.4' },
    { k:'keys_left', q:'Leave all keys and alarm codes at the property or with the agent', src:'B9.5' },
    { k:'care_removing', q:'Take care when removing fittings and repair any damage', src:'B9.6' }
  ]}
]},
{ title:'Documents and declaration', items:[
  { t:'radio', k:'epc_available', q:'Do you have an Energy Performance Certificate from the last ten years?', o:YN, src:'B6.1', note:'Could be fetched automatically from the public EPC register.' },
  { t:'file', k:'epc_file', q:'Upload the EPC', src:'B6.1', opt:true, when:C.epcYes },
  { t:'info', text:'You’ll need an EPC before the property can be marketed. Your agent can arrange one.', when:C.epcNo },
  { t:'group', title:'Identity check', hint:'Estate agents must check the identity of every seller. If Lifesycle already had a completed check for you, this would be skipped.', when:C.aml, items:[
    { t:'file', k:'aml_id', q:'Photo ID', hint:'Passport, driving licence or other government photo ID.', src:'B10' },
    { t:'file', k:'aml_address', q:'Proof of address', hint:'A utility bill or bank statement showing your full address.', src:'B10' }
  ]},
  { t:'check', k:'declaration_agreed', q:'The information I’ve given is accurate to the best of my knowledge. I’ll tell my conveyancer if anything changes before exchange of contracts.', src:'Declaration' },
  { t:'text', k:'signature_name', q:'Type your full name to sign', src:'Declaration', w:'half' }
]}
];

/* ---------- Flatten into facts ---------- */
export function flatten() {
  const out = [];
  SECTIONS.forEach((s, si) => {
    const walk = (items, ws, area) => items.forEach(it => {
      const my = it.when ? ws.concat([it.when]) : ws;
      if (it.t === 'group') return walk(it.items, my, area + ' › ' + it.title);
      if (it.t === 'info') return;
      if (it.t === 'matrix') return it.rows.forEach(r => out.push({
        k:r.k, q: it.mq ? it.mq + ': ' + r.q.charAt(0).toLowerCase() + r.q.slice(1) : r.q,
        src:r.src || it.src, ws: r.when ? my.concat([r.when]) : my, si, t:'radio', o:it.o, opt:false,
        area, ctx: area + ' › ' + it.q.replace(/…$/, '').trim() }));
      if (it.t === 'services') return it.rows.forEach(r => out.push({
        k:'svc_' + r.k, q:r.q + ': connected', label:r.q, src:r.src || it.src, ws:my, si, t:'services', o:YN, opt:false,
        area, ctx: area + ' › ' + it.q }));
      out.push({ k:it.k, q:it.q, src:it.src, ws:my, si, t:it.t, o:it.o, opt:!!it.opt, area, ctx:area });
    });
    walk(s.items, [], s.title);
  });
  return out;
}

/* ---------- Lookups built from the model ---------- */

/** Every fact, in form order. */
export const FACTS = flatten();

/** Fact by key. */
export const FACT = new Map(FACTS.map(f => [f.k, f]));

/** Sort position of each fact (a supplier sits right after its service). */
export const ORDER = new Map();
FACTS.forEach((f, i) => {
  ORDER.set(f.k, i * 2);
  if (f.t === 'services') ORDER.set(f.k + '_supplier', i * 2 + 1);
});

/** How each field type is described to the model. */
const AI_KIND = { number:'number', radio:'choice', services:'choice', multi:'multi', text:'text', textarea:'text', year:'year', date:'date', money:'money', percent:'percent' };

/** Fields the model may fill in from a document (uploads and the signature excluded). */
export const CAT = new Map();
FACTS.forEach(f => {
  const kind = AI_KIND[f.t];
  if (!kind || f.k === 'signature_name') return;
  CAT.set(f.k, Object.assign({}, f, { kind }));
  if (f.t === 'services') {
    CAT.set(f.k + '_supplier', {
      k:f.k + '_supplier', q:'Supplier for ' + f.label.toLowerCase(), area:f.area, ctx:f.ctx,
      kind:'text', t:'text', si:f.si, src:f.src,
      ws:f.ws.concat([W('the service is connected', a => a[f.k] === 'Yes')])
    });
  }
});

/** Upload fields a document can be attached to. */
export const FILE_FIELDS = FACTS.filter(f => f.t === 'file');

/** Any field, fillable or upload. */
export const factFor = k => CAT.get(k) || FACT.get(k);
