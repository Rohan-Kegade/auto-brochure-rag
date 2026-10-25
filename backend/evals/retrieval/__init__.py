import os

# DeepEval sends usage telemetry unless told not to; keep eval runs local.
os.environ.setdefault("DEEPEVAL_TELEMETRY_OPT_OUT", "YES")
