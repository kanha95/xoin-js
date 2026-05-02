import { z } from 'zod';
import dotenv from 'dotenv';

import { createOpenAIProvider, createXoin } from '../../dist/index.mjs';

dotenv.config({ path: new URL('./.env', import.meta.url).pathname });
dotenv.config();

async function main() {
  // -----------------------------
  // Complex Healthcare Schema (FIXED)
  // -----------------------------
  const healthcareSchema = z.object({
    patient: z.object({
      id: z.string(),
      name: z.string(),
      age: z.number().min(0).max(120),
      gender: z.enum(['male', 'female', 'other']),
      bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
      contact: z.object({
        phone: z.string(),
        email: z.string().email().nullable(), // ✅ FIXED
        address: z.string()
      })
    }),

    medicalHistory: z.array(
      z.object({
        condition: z.string(),
        diagnosedDate: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
        ongoing: z.boolean()
      })
    ),

    medications: z.array(
      z.object({
        name: z.string(),
        dosage: z.string(),
        frequency: z.string(),
        startDate: z.string(),
        endDate: z.string().nullable()
      })
    ),

    allergies: z.array(z.string()),

    labResults: z.array(
      z.object({
        testName: z.string(),
        result: z.string(),
        unit: z.string(),
        normalRange: z.string(),
        testDate: z.string()
      })
    ),

    doctorVisits: z.array(
      z.object({
        doctorName: z.string(),
        specialization: z.string(),
        visitDate: z.string(),
        notes: z.string().nullable(), // ✅ FIXED
        prescriptionGiven: z.boolean()
      })
    ),

    insurance: z.object({
      provider: z.string(),
      policyNumber: z.string(),
      validTill: z.string()
    }).nullable(), // ✅ FIXED

    emergencyContact: z.object({
      name: z.string(),
      relation: z.string(),
      phone: z.string()
    })
  });

  // -----------------------------
  // Improved Prompt (IMPORTANT)
  // -----------------------------
  const prompt = `
Generate a complete structured healthcare record.

IMPORTANT:
- Return ALL fields exactly as defined
- Use null if any value is missing
- Use ISO date format (YYYY-MM-DD)
- Use exact enum values: male, female, other, low, medium, high

Patient: Ruturaj Patil, 32, male, blood group O+
Lives in Pune, phone 9876543210, email ruturaj@gmail.com

Medical History:
- Diabetes diagnosed in 2020, medium severity, ongoing
- Asthma diagnosed in 2015, low severity, ongoing

Medications:
- Metformin 500mg twice daily since 2020
- Salbutamol inhaler as needed since 2015

Allergies:
- Penicillin
- Dust

Lab Results:
- HbA1c: 7.2%, normal 4-6%, tested Jan 2024
- Fasting Sugar: 130 mg/dL, normal 70-100, tested Jan 2024

Doctor Visits:
- Dr. Sharma (Endocrinologist) on Jan 2024, prescribed meds
- Dr. Mehta (Pulmonologist) on Feb 2024

Insurance:
- HDFC Ergo, policy HDF12345, valid till Dec 2026

Emergency Contact:
- Suresh Patil (Father), phone 9123456780
`;

  // -----------------------------
  // Xoin Setup
  // -----------------------------
  const xoin = createXoin({
    providers: {
      openai: createOpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY || '',
        defaultModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      }),
    },
  });

  // -----------------------------
  // Generate Structured Output
  // -----------------------------
  const result = await xoin.generate({
    provider: 'openai',
    prompt,
    structured: {
      name: 'healthcare_record',
      schema: healthcareSchema,
    },
  });

  console.log('✅ Structured Output:\n');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exitCode = 1;
});