# Backend Architecture Reference

## Grading method auto-detection

The grading coordinator selects an engine based on the answer format:

| Answer format | Engine | Example |
|---|---|---|
| Math operators (`^`, `sin`, `cos`, `√`…) | Symbolic (SymPy) | `sinc^2(phi)` |
| Pure numbers or numbers with units | Numerical (tolerance) | `13.7 K` |
| Binary sequences or plain text | Pattern matching | `11,101,111` |
| Free-form explanation | AI (OpenAI) | prose text |

## Grading complexity levels

- **Level 1** — Exact match (binary sequences, multiple choice)
- **Level 2** — Tolerance-based (numerical with units, rounding)
- **Level 3** — Symbolic equivalence (math expressions, multiple valid forms)
- **Level 4** — AI-assisted (free-form explanations)

## Problem types

`symbolic` `numerical` `multi_step` `viterbi` `fill_in_blank`

## Problem template parameter format

```json
{
  "parameters": {
    "param_ta": {"type": "float", "min": 8.0, "max": 15.0, "step": 0.5},
    "param_ts": {"type": "float", "min": 280.0, "max": 300.0, "step": 1.0}
  },
  "solution": "{param_ta} + {param_ts}"
}
```

Calling `template.generate_instance(student)` produces a unique `ProblemInstance` per student with values drawn from the parameter ranges.

## Assignment data flow

1. Instructor creates `ProblemTemplate`
2. Instructor creates `Assignment` (links template, sets open/due/reveal dates)
3. Student accesses Assignment → system auto-generates a unique `ProblemInstance`
4. Student sees their specific values and submits an answer
5. System grades; results shown based on `reveal_date`

Assignment status fields: `is_open`, `is_past_due`, `can_submit`, `can_reveal`, `time_remaining`

## API base URL

`http://localhost:8000/api`
