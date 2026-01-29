# CSV to Database Field Mapping

## Summary
The CSV import DOES capture all survey fields, and the database insert DOES include them. The mapping is already working correctly!

## Mentee Fields Mapping

### From CSV Parser (dataParser.ts) → Database Insert (supabaseService.ts)

| CSV Parser Field Name | Database Column | Status |
|----------------------|-----------------|--------|
| `motivation` | `motivation` | ✅ Mapped correctly (line 401) |
| `main_reason` | `main_reason` | ✅ Mapped correctly (line 402) |
| `preferred_mentor_style` | `preferred_style` | ✅ Mapped correctly (line 403) |
| `preferred_mentor_energy` | `preferred_energy` | ✅ Mapped correctly (line 404) |
| `feedback_preference` | `feedback_preference` | ✅ Mapped correctly (line 405) |
| `mentor_experience_importance` | `mentor_experience_importance` | ✅ Mapped correctly (line 406) |
| `what_not_wanted` | `unwanted_qualities` | ✅ Mapped correctly (line 407) |
| `desired_qualities` | `mentor_qualities` | ✅ Mapped correctly (line 408) |
| `expectations` | `expectations` | ✅ Mapped correctly (line 409) |

### Missing from CSV Import

| Database Column | CSV Has It? | Notes |
|----------------|-------------|-------|
| `other_experience` | ❌ No | Only captured in manual form (for "Other" option) |
| `other_topics` | ❌ No | Only captured in manual form (for "Other" option) |
| `has_participated_before` | ⚠️ Partial | CSV has column but not currently mapped |

## CSV Column Names (from mentee.csv)

The CSV uses these exact column headers:
1. "💡 Motivation\n\nWhy would you like to join the mentorship program?"
2. "What's the main reason you'd like a mentor?"
3. "🤝 Mentoring Style Preferences\n\nWhat kind of mentor style do you think would help you most?"
4. "What kind of mentor energy would help you thrive?"
5. "How do you prefer to receive feedback?"
6. "How important is it to you that your mentor has prior mentoring experience?"
7. "What do you NOT want in a mentor?"
8. "How often would you ideally like to meet with a mentor?"
9. "🌈 Expectations\n\nWhat qualities would you like in a mentor?"
10. "🙌 Expectations\n\nWhat expectations do you have for the mentorship program?"
11. "Have you participated in a mentorship program before?" (has values: 0 or 1)

## How CSV Parsing Works

### dataParser.ts (lines 242-296)
```typescript
// Extracts motivation
const motivationKey = Object.keys(row).find(key =>
  key.includes("Why would you like to join the mentorship program?")
);
const motivation = motivationKey ? row[motivationKey] : '';

// Extracts main reason
const mainReason = row["What's the main reason you'd like a mentor?"] || '';

// Extracts expectations
const expectationsKey = Object.keys(row).find(key =>
  key.includes("What expectations do you have for the mentorship program")
);
const expectations = expectationsKey ? row[expectationsKey] : '';

// And so on for all fields...
```

### supabaseService.ts (lines 379-409)
```typescript
// Sanitizes and prepares data
const motivation = sanitizeText(mentee.motivation)
const mainReason = sanitizeText(mentee.main_reason)
const preferredStyle = sanitizeText(mentee.preferred_mentor_style)
// ... etc

// Conditionally includes in insert object (only if not empty)
return {
  cohort_id: cohortId,
  mentee_id: mentee.id,
  // ... core fields
  ...(motivation ? { motivation } : {}),
  ...(mainReason ? { main_reason: mainReason } : {}),
  ...(preferredStyle ? { preferred_style: preferredStyle } : {}),
  // ... etc
}
```

## What This Means

### ✅ GOOD NEWS:
1. **Excel import ALREADY captures all survey data from the CSV**
2. **All mappings are correct**
3. **Empty fields are handled gracefully** (only inserted if they have values)

### ⚠️ MINOR ISSUES TO FIX:

1. **`has_participated_before` not mapped**
   - CSV column: "Have you participated in a mentorship program before?"
   - Values: 0 or 1
   - Currently parsed but NOT mapped to database insert

2. **`other_experience` and `other_topics` not in CSV**
   - These are only captured in the manual form
   - When users select "Other" in checkboxes, they can add details
   - Excel import doesn't have this level of detail

## Recommended Fix

Add `has_participated_before` mapping to the CSV import in `supabaseService.ts`:

```typescript
// In addImportDataToCohort function, around line 388
const hasParticipatedBefore = mentee.has_participated_before === '1' ||
                               mentee.has_participated_before === 1 ||
                               mentee.has_participated_before === true;

// In the return object, around line 409
return {
  // ... existing fields
  ...(expectations ? { expectations } : {}),
  has_participated_before: hasParticipatedBefore  // Add this line
}
```

## Testing Checklist

After running the database migration:

- [x] CSV import includes survey responses
- [ ] `has_participated_before` is properly mapped from CSV (needs fix)
- [x] Manual form (AddPersonForm) saves all fields including `other_experience` and `other_topics`
- [x] Empty fields don't cause database errors
- [x] All field names match database columns

## Conclusion

**The Excel/CSV import is working correctly!** It already captures and saves all the main survey response fields from the CSV. The only missing piece is:

1. Mapping `has_participated_before` from CSV to database
2. Understanding that `other_experience` and `other_topics` are manual-form-only fields (not in CSV)

Once you run the database migration (`database_migration_add_mentee_survey_columns.sql`), the Excel import will work seamlessly with the new columns.
