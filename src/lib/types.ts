export interface AssetRow {
  desc: string
  own: string
  val: string
}

export interface ClientFormData {
  // Step 1 — client details
  c1_first: string; c1_last: string; c1_age: string
  c1_employment: string; c1_income: string; c1_health: string
  c2_first: string; c2_last: string; c2_age: string
  c2_employment: string; c2_income: string; c2_health: string
  entity_name: string; entity_type: string; entity_address: string
  // Step 2 — financial position
  assets: AssetRow[]
  liabilities: AssetRow[]
  // Step 3 — investment profile
  inv_timeframe: string; inv_experience: string
  risk_tolerance: string; inv_objective: string
  goals_text: string; limitations_text: string
}

export interface AdviserFormData {
  invest_amount: string; portfolio_vehicle: string
  adviser_name: string; proposal_date: string
  products: string[]
  au_eq_min: string; au_eq_max: string
  int_eq_min: string; int_eq_max: string
  prop_min: string;   prop_max: string
  debt_min: string;   debt_max: string
  fixed_min: string;  fixed_max: string
  cash_min: string;   cash_max: string
  extra_notes: string
}

export type FullFormData = ClientFormData & AdviserFormData

export const CLIENT_DEFAULTS: ClientFormData = {
  c1_first: '', c1_last: '', c1_age: '', c1_employment: '', c1_income: '', c1_health: 'Good',
  c2_first: '', c2_last: '', c2_age: '', c2_employment: '', c2_income: '', c2_health: 'Good',
  entity_name: '', entity_type: '', entity_address: '',
  assets: [
    { desc: 'Primary Residence', own: 'Joint', val: '' },
    { desc: 'Superannuation', own: 'Joint', val: '' },
    { desc: 'Cash', own: 'Joint', val: '' },
  ],
  liabilities: [
    { desc: 'Investment Property Loans', own: 'Joint', val: '' },
  ],
  inv_timeframe: '5-7 years', inv_experience: '5+ years',
  risk_tolerance: 'Medium / Balanced', inv_objective: 'Balance of income and growth',
  goals_text: '', limitations_text: '',
}

export const ADVISER_DEFAULTS: AdviserFormData = {
  invest_amount: '', portfolio_vehicle: '', adviser_name: '', proposal_date: '',
  products: ['Australian Shares','International Shares','Listed Managed Funds',
             'Listed Debt Securities','Listed Property Trust','IPOs','Hybrids',
             'Bonds','Cash Management Account'],
  au_eq_min: '30', au_eq_max: '50',
  int_eq_min: '10', int_eq_max: '25',
  prop_min:   '0',  prop_max:  '15',
  debt_min:  '20',  debt_max:  '30',
  fixed_min: '20',  fixed_max: '30',
  cash_min:   '0',  cash_max:  '25',
  extra_notes: '',
}
