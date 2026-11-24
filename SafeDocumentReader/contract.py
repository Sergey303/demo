"""Strict report structure; does not certify truth or completeness."""
import json
import unicodedata
MAX_OUTPUT = 1024 * 1024
FIELDS = ("summary","requirements","suspicions","uncertainties")
SCHEMA = {"type":"object","additionalProperties":False,
          "properties":{"summary":{"type":"string"},
              **{k:{"type":"array","items":{"type":"string"}} for k in FIELDS[1:]}},
          "required":list(FIELDS)}

def text(value, limit):
    if not isinstance(value,str) or len(value)>limit:
        raise ValueError("Invalid text")
    if any(unicodedata.category(c) in {"Cc","Cf","Cs"} and c not in "\n\t" for c in value):
        raise ValueError("Unsafe display characters")
    return value

def page(obj):
    if not isinstance(obj,dict) or set(obj)!=set(FIELDS):
        raise ValueError("Unexpected fields")
    result={"summary":text(obj["summary"],4000)}
    for key in FIELDS[1:]:
        if not isinstance(obj[key],list) or len(obj[key])>40:
            raise ValueError("Invalid list")
        result[key]=[text(x,2000) for x in obj[key]]
    return result

def unique(pairs):
    result={}
    for key,value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON key")
        result[key]=value
    return result

def parse(raw):
    if len(raw)>MAX_OUTPUT:
        raise ValueError("Oversized output")
    return json.loads(raw,object_pairs_hook=unique)

def validate(raw,count):
    obj=parse(raw)
    if not isinstance(obj,list) or len(obj)!=count:
        raise ValueError("Incomplete report")
    return [{"page":i,**page(x)} for i,x in enumerate(obj,1)]


def human_report(pages):
    """Inert text, with source-page numbers and indented untrusted lines."""
    lines = ["UNVERIFIED — HUMAN REVIEW REQUIRED",
             "Warnings may be incomplete. Check facts against page images.", ""]
    for item in pages:
        lines.append("PAGE " + str(item["page"]))
        for key in FIELDS:
            lines.append("  " + key.upper() + ":")
            values = [item[key]] if key == "summary" else item[key]
            for value in values:
                lines.extend("    " + line for line in value.split("\n"))
            if not values:
                lines.append("    (none reported)")
        lines.append("")
    return "\n".join(lines) + "\n"
