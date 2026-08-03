import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Tuple

NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


def column_index(cell_ref: str) -> int:
    letters = "".join(ch for ch in cell_ref if ch.isalpha())
    index = 0
    for letter in letters:
        index = index * 26 + ord(letter.upper()) - 64
    return index - 1


def normalize_key(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_]+", "_", value.strip()).strip("_").lower()


def cell_value(cell: ET.Element, shared_strings: List[str]) -> str:
    cell_type = cell.attrib.get("t")
    value = cell.find("m:v", NS)
    inline = cell.find("m:is", NS)
    if cell_type == "s" and value is not None:
        return shared_strings[int(value.text or "0")]
    if cell_type == "inlineStr" and inline is not None:
        return "".join(text.text or "" for text in inline.iter(f"{{{NS['m']}}}t"))
    if value is not None:
        return value.text or ""
    return ""


def parse_sheet(root: ET.Element, shared_strings: List[str]) -> List[Tuple[int, List[str]]]:
    parsed_rows: List[Tuple[int, List[str]]] = []
    for row in root.findall(".//m:sheetData/m:row", NS):
        values: List[str] = []
        for cell in row.findall("m:c", NS):
            index = column_index(cell.attrib["r"])
            while len(values) < index:
                values.append("")
            values.append(cell_value(cell, shared_strings).strip())
        while values and values[-1] == "":
            values.pop()
        if any(values):
            parsed_rows.append((int(float(row.attrib["r"])), values))
    return parsed_rows


def looks_like_header(row: List[str]) -> bool:
    if len(row) < 2:
        return False
    first = row[0].strip()
    if not first or " " in first:
        return False
    known_suffixes = ("_id", "_name", "_type", "_status", "_title")
    return first == "question_type" or first.endswith(known_suffixes) or first in {
        "world_id",
        "sub_world_id",
        "chapter_id",
        "competency_id",
        "subcompetency_id",
        "mission_id",
        "question_id",
        "option_row_id",
        "media_row_id",
        "mapping_id",
        "sheet_name",
        "path_id",
        "blueprint_row_id",
        "asset_id",
        "review_id",
    }


def table_from_rows(rows: List[Tuple[int, List[str]]]) -> dict:
    header_index = next(
        (index for index, (_, values) in enumerate(rows) if looks_like_header(values)),
        None,
    )
    if header_index is None:
        return {"headers": [], "rows": []}

    header_row_number, headers = rows[header_index]
    normalized_headers = [normalize_key(header) for header in headers]
    records: List[dict] = []
    for row_number, values in rows[header_index + 1 :]:
        record: dict = {"_rowNumber": row_number}
        has_value = False
        for index, header in enumerate(normalized_headers):
            if not header:
                continue
            value = values[index].strip() if index < len(values) else ""
            if value != "":
                has_value = True
                record[header] = value
        if has_value:
            records.append(record)

    return {
        "headerRowNumber": header_row_number,
        "headers": normalized_headers,
        "rows": records,
    }


def export_workbook(source: Path, destination: Path) -> None:
    with zipfile.ZipFile(source) as archive:
        shared_strings: List[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in shared_root.findall("m:si", NS):
                shared_strings.append(
                    "".join(text.text or "" for text in item.iter(f"{{{NS['m']}}}t"))
                )

        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        relmap = {
            rel.attrib["Id"]: rel.attrib["Target"]
            for rel in rels.findall("rel:Relationship", NS)
        }

        sheets: dict = {}
        for sheet in workbook.find("m:sheets", NS):
            sheet_name = sheet.attrib["name"]
            rel_id = sheet.attrib[f"{{{NS['r']}}}id"]
            target = relmap[rel_id]
            sheet_path = "xl/" + target.lstrip("/") if not target.startswith("xl/") else target
            sheet_root = ET.fromstring(archive.read(sheet_path))
            sheets[sheet_name] = table_from_rows(parse_sheet(sheet_root, shared_strings))

    payload = {
        "workbook": source.name,
        "sourcePath": str(source),
        "sheets": sheets,
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    row_count = sum(len(sheet.get("rows", [])) for sheet in sheets.values() if isinstance(sheet, dict))
    print(f"Exported {row_count} curriculum rows to {destination}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: export_curriculum_xlsx.py <source.xlsx> <destination.json>")
    export_workbook(Path(sys.argv[1]), Path(sys.argv[2]))
