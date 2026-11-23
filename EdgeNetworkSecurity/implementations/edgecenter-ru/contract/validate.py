"""Validate staging policy intent from a local file."""
import argparse
import json
from pathlib import Path

from jsonschema import Draft202012Validator

SCHEMA = Path(__file__).with_name("policy.schema.json")


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON member")
        result[key] = value
    return result


def reject_constant(_value):
    raise ValueError("non-JSON constant")


def load_json(path):
    with path.open(encoding="utf-8") as stream:
        return json.load(stream, object_pairs_hook=unique_object, parse_constant=reject_constant)


def validate(policy):
    schema = load_json(SCHEMA)
    Draft202012Validator.check_schema(schema)
    # Report only schema keywords, which cannot echo values or caller-supplied keys.
    errors = sorted({error.validator for error in Draft202012Validator(schema).iter_errors(policy)})
    if errors:
        return errors
    if policy["rollback_revision"] >= policy["revision"]:
        return ["rollback revision must precede current revision"]
    return []


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("policy", type=Path)
    args = parser.parse_args()
    try:
        errors = validate(load_json(args.policy))
    except (OSError, ValueError, RecursionError):
        parser.exit(2, "Invalid or unreadable JSON policy\n")
    if errors:
        parser.exit(1, "Invalid policy (" + ", ".join(errors) + ")\n")
    print("Valid offline staging policy")


if __name__ == "__main__":
    main()
