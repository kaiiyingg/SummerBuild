-- Run this in Supabase Dashboard > SQL Editor to add patient-facing medication info.
-- It is safe to rerun: columns are added only if missing, and known medications are updated consistently by name.

alter table public.patient_medications
  add column if not exists purpose text,
  add column if not exists instructions text,
  add column if not exists caution text;

with medication_info(med_key, purpose, instructions, caution) as (
  values
    ('amlodipine', $$High Blood Pressure$$, $$Take exactly as prescribed on your medication label, usually once daily.$$, null),
    ('amoxicillin', $$Bacterial Infection$$, $$Take exactly as prescribed and complete the full course unless your doctor tells you otherwise.$$, $$Tell your pharmacist or doctor if you develop a rash, swelling, or breathing difficulty.$$),
    ('aspirin', $$Heart Disease Prevention$$, $$Take 1 tablet once daily after breakfast with a full glass of water.$$, null),
    ('atorvastatin', $$High Cholesterol$$, $$Take 1 tablet once daily at bedtime. Avoid grapefruit juice.$$, $$Avoid grapefruit juice. Report any unexplained muscle pain or weakness to your doctor.$$),
    ('bisoprolol', $$Heart Rate and Blood Pressure Control$$, $$Take exactly as prescribed on your medication label, usually once daily.$$, $$Do not stop taking suddenly unless your doctor tells you to.$$),
    ('calcium carbonate', $$Calcium Supplement or Indigestion Relief$$, $$Take exactly as prescribed on your medication label.$$, null),
    ('cetirizine', $$Allergy Relief$$, $$Take exactly as prescribed on your medication label, usually once daily.$$, $$May cause drowsiness in some people.$$),
    ('clopidogrel', $$Blood Clot Prevention$$, $$Take exactly as prescribed on your medication label.$$, $$Do not stop taking without checking with your doctor or pharmacist.$$),
    ('dapagliflozin', $$Type 2 Diabetes$$, $$Take exactly as prescribed on your medication label, usually once daily.$$, $$Stay hydrated and seek advice if you feel unwell, dehydrated, or have symptoms of infection.$$),
    ('enalapril', $$High Blood Pressure or Heart Protection$$, $$Take exactly as prescribed on your medication label.$$, $$Do not stop taking without consulting your doctor, even if you feel well.$$),
    ('famotidine', $$Stomach Acid Relief$$, $$Take exactly as prescribed on your medication label.$$, null),
    ('fluoxetine', $$Mood Support$$, $$Take exactly as prescribed on your medication label, usually once daily.$$, $$Do not stop suddenly unless your doctor tells you to.$$),
    ('furosemide', $$Fluid Retention$$, $$Take exactly as prescribed on your medication label.$$, $$May make you pass urine more often. Ask your pharmacist if you are unsure about timing.$$),
    ('glipizide', $$Type 2 Diabetes$$, $$Take exactly as prescribed on your medication label, usually before meals.$$, $$Know the signs of low blood sugar and follow your care team's advice.$$),
    ('ibuprofen', $$Pain and Inflammation$$, $$Take exactly as prescribed on your medication label, preferably with food.$$, $$Avoid taking with other anti-inflammatory painkillers unless advised by a healthcare professional.$$),
    ('lisinopril', $$High Blood Pressure$$, $$Take 1 tablet once daily in the morning. Monitor blood pressure regularly.$$, $$Do not stop taking without consulting your doctor, even if you feel well.$$),
    ('loratadine', $$Allergy Relief$$, $$Take exactly as prescribed on your medication label, usually once daily.$$, null),
    ('losartan', $$High Blood Pressure$$, $$Take exactly as prescribed on your medication label.$$, $$Do not stop taking without consulting your doctor, even if you feel well.$$),
    ('melatonin', $$Sleep Support$$, $$Take exactly as prescribed on your medication label, usually before bedtime.$$, $$May cause drowsiness. Avoid driving if it affects your alertness.$$),
    ('metformin', $$Type 2 Diabetes$$, $$Take 1 tablet twice daily with meals. Do not skip doses.$$, $$May cause stomach upset if taken without food. Swallow whole, do not crush or chew.$$),
    ('omeprazole', $$Stomach Acid Relief$$, $$Take exactly as prescribed on your medication label, usually before food.$$, null),
    ('pantoprazole', $$Stomach Acid Relief$$, $$Take exactly as prescribed on your medication label, usually before food.$$, null),
    ('paracetamol', $$Pain or Fever$$, $$Take exactly as prescribed on your medication label. Keep within the stated daily limit.$$, $$Do not take more than the recommended dose or combine with other products containing paracetamol.$$),
    ('potassium chloride', $$Potassium Supplement$$, $$Take exactly as prescribed on your medication label, preferably with food or water.$$, $$Do not crush or chew modified-release tablets unless your pharmacist says it is safe.$$),
    ('salbutamol', $$Breathing Relief$$, $$Use exactly as prescribed on your inhaler label.$$, $$Seek medical advice if you need to use it more often than usual.$$),
    ('simvastatin', $$High Cholesterol$$, $$Take exactly as prescribed on your medication label, usually in the evening.$$, $$Avoid grapefruit juice. Report any unexplained muscle pain or weakness to your doctor.$$),
    ('vitamin d3', $$Vitamin D Supplement$$, $$Take exactly as prescribed on your medication label.$$, null)
)
update public.patient_medications as pm
set purpose = medication_info.purpose,
    instructions = medication_info.instructions,
    caution = medication_info.caution
from medication_info
where lower(pm.name) like '%' || medication_info.med_key || '%';
