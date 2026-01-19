"""
CCS-WB - Python Analysis Service

FastAPI microservice for code analysis, file processing,
and supporting critical code studies analysis tasks.
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any
import pandas as pd
import numpy as np
from io import BytesIO
import json
import tempfile
import os

app = FastAPI(
    title="CCS-WB Analysis Service",
    description="Code analysis and file processing for critical code studies",
    version="0.1.0",
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Response models
class VariableStats(BaseModel):
    name: str
    dtype: str
    count: int
    missing: int
    unique: Optional[int] = None
    mean: Optional[float] = None
    std: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    median: Optional[float] = None


class FileSummary(BaseModel):
    filename: str
    rows: int
    columns: int
    variables: list[VariableStats]
    file_type: str


class AnalysisResult(BaseModel):
    type: str
    summary: str
    details: dict[str, Any]
    rigor_warnings: list[dict[str, str]]


# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "analysis"}


# Test endpoint to create sample files in various formats
@app.get("/create-test-files")
async def create_test_files():
    """Create sample test files in different formats for testing."""
    import pyreadstat

    # Create sample data
    np.random.seed(42)
    n = 50
    data = {
        'id': range(1, n + 1),
        'department': np.random.choice(['Sales', 'Engineering', 'Marketing', 'HR'], n),
        'tenure': np.random.uniform(0.5, 15, n).round(1),
        'salary': np.random.normal(75000, 15000, n).round(0),
        'performance': np.random.uniform(1, 5, n).round(2),
    }
    df = pd.DataFrame(data)

    results = {}
    test_data_dir = os.path.join(os.path.dirname(__file__), '..', 'test-data')

    # Create SPSS file
    try:
        sav_path = os.path.join(test_data_dir, 'test_employee.sav')
        pyreadstat.write_sav(df, sav_path)
        results['spss'] = f"Created {sav_path}"
    except Exception as e:
        results['spss'] = f"Error: {e}"

    # Create Stata file
    try:
        dta_path = os.path.join(test_data_dir, 'test_employee.dta')
        pyreadstat.write_dta(df, dta_path)
        results['stata'] = f"Created {dta_path}"
    except Exception as e:
        results['stata'] = f"Error: {e}"

    # Create R data file (.rds) - using pyreadr if available
    try:
        import pyreadr
        rds_path = os.path.join(test_data_dir, 'test_employee.rds')
        pyreadr.write_rds(rds_path, df)
        results['r_rds'] = f"Created {rds_path}"
    except ImportError:
        # pyreadr not available, try creating a simple RDS file manually
        # The rdata library can only read, not write R files
        results['r_rds'] = "pyreadr not installed - cannot create R files"
    except Exception as e:
        results['r_rds'] = f"Error: {e}"

    return results


# File upload and summary
@app.post("/upload", response_model=FileSummary)
async def upload_file(file: UploadFile = File(...)):
    """
    Upload and summarize a data file.
    Supports: CSV, Excel, Stata, SPSS, R data files.
    """
    if file.size > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=413,
            detail="File size exceeds 10MB limit. Consider sampling or splitting your data.",
        )

    filename = file.filename or "uploaded_file"
    extension = filename.split(".")[-1].lower()
    content = await file.read()

    try:
        df = read_data_file(content, extension)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse file: {str(e)}. Please check the file format.",
        )

    # Generate variable summaries
    variables = []
    for col in df.columns:
        series = df[col]
        var_stats = VariableStats(
            name=str(col),
            dtype=str(series.dtype),
            count=int(series.count()),
            missing=int(series.isna().sum()),
        )

        if pd.api.types.is_numeric_dtype(series):
            var_stats.mean = float(series.mean()) if not series.isna().all() else None
            var_stats.std = float(series.std()) if not series.isna().all() else None
            var_stats.min = float(series.min()) if not series.isna().all() else None
            var_stats.max = float(series.max()) if not series.isna().all() else None
            var_stats.median = float(series.median()) if not series.isna().all() else None
        else:
            var_stats.unique = int(series.nunique())

        variables.append(var_stats)

    return FileSummary(
        filename=filename,
        rows=len(df),
        columns=len(df.columns),
        variables=variables,
        file_type=extension,
    )


def read_data_file(content: bytes, extension: str) -> pd.DataFrame:
    """Read a data file and return a pandas DataFrame."""
    buffer = BytesIO(content)

    if extension in ["csv"]:
        return pd.read_csv(buffer)
    elif extension in ["xlsx", "xls"]:
        return pd.read_excel(buffer)
    elif extension in ["dta"]:
        import pyreadstat
        # pyreadstat requires a file path, not BytesIO
        with tempfile.NamedTemporaryFile(suffix='.dta', delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        try:
            df, meta = pyreadstat.read_dta(tmp_path)
            return df
        finally:
            os.unlink(tmp_path)
    elif extension in ["sav"]:
        import pyreadstat
        # pyreadstat requires a file path, not BytesIO
        # Use mode='wb' explicitly for binary write
        with tempfile.NamedTemporaryFile(suffix='.sav', delete=False, mode='wb') as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        try:
            print(f"SPSS file size: {len(content)} bytes, temp path: {tmp_path}")
            print(f"First 20 bytes: {content[:20]}")
            # Try read_sav first (standard SPSS format)
            df, meta = pyreadstat.read_sav(tmp_path)
            return df
        except Exception as e1:
            print(f"SPSS read_sav error: {e1}")
            try:
                # Try pandas read_spss as fallback
                df = pd.read_spss(tmp_path)
                return df
            except Exception as e2:
                print(f"Pandas read_spss error: {e2}")
                raise ValueError(f"Could not read SPSS file. Errors: sav={e1}, pandas={e2}")
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    elif extension in ["rds"]:
        import rdata
        import warnings
        # rdata requires a file path, not BytesIO
        print(f"RDS file size: {len(content)} bytes")
        print(f"First 20 bytes: {content[:20]}")
        with tempfile.NamedTemporaryFile(suffix='.rds', delete=False, mode='wb') as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        try:
            parsed = rdata.parser.parse_file(tmp_path)
            # Suppress encoding warnings and use default_encoding to handle non-ASCII data
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                try:
                    converted = rdata.conversion.convert(parsed, default_encoding='latin1')
                except TypeError:
                    # Older versions of rdata may not support default_encoding
                    converted = rdata.conversion.convert(parsed)
            print(f"RDS converted type: {type(converted)}")
            # rds files contain a single object
            if isinstance(converted, pd.DataFrame):
                return converted
            # If it's not a DataFrame directly, check if it's dict-like with dataframes inside
            if hasattr(converted, 'keys'):
                for key in converted:
                    if isinstance(converted[key], pd.DataFrame):
                        return converted[key]
            raise ValueError(f"RDS file does not contain a DataFrame. Got: {type(converted)}")
        except Exception as e:
            print(f"RDS parse error: {e}")
            raise
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    elif extension in ["rda", "rdata"]:
        import rdata
        # rdata requires a file path, not BytesIO
        with tempfile.NamedTemporaryFile(suffix=f'.{extension}', delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        try:
            parsed = rdata.parser.parse_file(tmp_path)
            converted = rdata.conversion.convert(parsed)
            # rda files contain a dict of objects
            if isinstance(converted, dict):
                for key, value in converted.items():
                    if isinstance(value, pd.DataFrame):
                        return value
            raise ValueError("RDA file does not contain a DataFrame")
        finally:
            os.unlink(tmp_path)
    elif extension in ["pdf"]:
        # PDF files are not tabular data - raise special error to route to document analysis
        raise ValueError("PDF_DOCUMENT")
    elif extension in ["txt"]:
        # TXT files are not tabular data - raise special error to route to text analysis
        raise ValueError("TEXT_DOCUMENT")
    else:
        raise ValueError(f"Unsupported file format: {extension}")


# Descriptive analysis
@app.post("/analyze/descriptive", response_model=AnalysisResult)
async def analyze_descriptive(file: UploadFile = File(...)):
    """Run descriptive statistics on uploaded data."""
    content = await file.read()
    extension = (file.filename or "").split(".")[-1].lower()

    try:
        df = read_data_file(content, extension)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Get numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

    if not numeric_cols:
        return AnalysisResult(
            type="descriptive",
            summary="No numeric variables found for descriptive analysis.",
            details={"categorical_columns": df.columns.tolist()},
            rigor_warnings=[],
        )

    # Calculate statistics
    stats = df[numeric_cols].describe().to_dict()

    # Check for potential issues
    warnings = []

    # Check for small sample size
    if len(df) < 30:
        warnings.append({
            "type": "sample_size",
            "message": f"Small sample size (n={len(df)}). Results may not be generalizable.",
            "severity": "high",
        })

    # Check for high missing data
    for col in numeric_cols:
        missing_pct = df[col].isna().sum() / len(df) * 100
        if missing_pct > 20:
            warnings.append({
                "type": "missing_data",
                "message": f"High missing data in '{col}' ({missing_pct:.1f}%). Consider implications for analysis.",
                "severity": "medium",
            })

    return AnalysisResult(
        type="descriptive",
        summary=f"Analyzed {len(numeric_cols)} numeric variables across {len(df)} observations.",
        details={"statistics": stats, "sample_size": len(df)},
        rigor_warnings=warnings,
    )


# Anomaly detection
@app.post("/analyze/anomaly", response_model=AnalysisResult)
async def analyze_anomalies(file: UploadFile = File(...)):
    """Detect statistical anomalies and outliers in the data."""
    content = await file.read()
    extension = (file.filename or "").split(".")[-1].lower()

    try:
        df = read_data_file(content, extension)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    anomalies = []
    warnings = []

    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) < 10:
            continue

        # IQR-based outlier detection
        q1, q3 = series.quantile([0.25, 0.75])
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr

        outliers = series[(series < lower_bound) | (series > upper_bound)]
        if len(outliers) > 0:
            anomalies.append({
                "variable": col,
                "outlier_count": len(outliers),
                "outlier_percentage": len(outliers) / len(series) * 100,
                "lower_bound": float(lower_bound),
                "upper_bound": float(upper_bound),
            })

    # Add multiple testing warning if checking many variables
    if len(numeric_cols) > 5:
        warnings.append({
            "type": "multiple_testing",
            "message": f"Checking {len(numeric_cols)} variables increases chance of spurious findings. Consider theory-driven selection.",
            "severity": "medium",
        })

    if not anomalies:
        summary = "Good news: No statistical outliers detected. Your data appears consistent with expected patterns, which suggests it aligns with theoretical predictions. Consider exploring: (1) different variables or subgroups, (2) interaction effects, or (3) qualitative data that might reveal subtle tensions not captured in statistics."
        # Add a suggestion to the warnings
        warnings.append({
            "type": "no_anomalies",
            "message": "No anomalies found. This could mean the data matches theory, or that the interesting variation lies elsewhere. Try examining subgroups or looking at interactions between variables.",
            "severity": "info",
        })
    else:
        summary = f"Found potential outliers in {len(anomalies)} of {len(numeric_cols)} numeric variables."

    return AnalysisResult(
        type="anomaly",
        summary=summary,
        details={"anomalies": anomalies, "variables_checked": len(numeric_cols)},
        rigor_warnings=warnings,
    )


# Correlation analysis
@app.post("/analyze/correlation", response_model=AnalysisResult)
async def analyze_correlations(file: UploadFile = File(...)):
    """Analyze correlations between numeric variables."""
    content = await file.read()
    extension = (file.filename or "").split(".")[-1].lower()

    try:
        df = read_data_file(content, extension)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

    if len(numeric_cols) < 2:
        return AnalysisResult(
            type="correlation",
            summary="Need at least 2 numeric variables for correlation analysis.",
            details={},
            rigor_warnings=[],
        )

    # Calculate correlation matrix
    corr_matrix = df[numeric_cols].corr()

    # Find strong correlations
    strong_correlations = []
    for i, col1 in enumerate(numeric_cols):
        for col2 in numeric_cols[i + 1:]:
            corr = corr_matrix.loc[col1, col2]
            if abs(corr) > 0.5 and not np.isnan(corr):
                strong_correlations.append({
                    "var1": col1,
                    "var2": col2,
                    "correlation": float(corr),
                })

    warnings = []

    # Multiple testing warning
    num_tests = len(numeric_cols) * (len(numeric_cols) - 1) / 2
    if num_tests > 10:
        warnings.append({
            "type": "multiple_testing",
            "message": f"Testing {int(num_tests)} correlations. Some may be significant by chance alone.",
            "severity": "high",
        })

    summary = f"Analyzed correlations among {len(numeric_cols)} variables. "
    if strong_correlations:
        summary += f"Found {len(strong_correlations)} strong relationships (|r| > 0.5)."
    else:
        summary += "No strong correlations (|r| > 0.5) detected."

    return AnalysisResult(
        type="correlation",
        summary=summary,
        details={
            "correlation_matrix": corr_matrix.to_dict(),
            "strong_correlations": sorted(
                strong_correlations, key=lambda x: abs(x["correlation"]), reverse=True
            ),
        },
        rigor_warnings=warnings,
    )


# Theme analysis for qualitative data
@app.post("/analyze/theme", response_model=AnalysisResult)
async def analyze_themes(file: UploadFile = File(...)):
    """Extract recurring themes from qualitative text data."""
    content = await file.read()

    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Unable to decode text file. Please ensure it's UTF-8 encoded.")

    # Simple theme extraction using word frequency analysis
    # In production, this could use NLP libraries like spaCy or NLTK
    import re
    from collections import Counter

    # Define common themes to look for in organizational research
    theme_patterns = {
        "communication": r"\b(communication|communicat\w*|messag\w*|email\w*|meeting\w*|inform\w*)\b",
        "leadership": r"\b(leader\w*|management|manager\w*|director\w*|executive\w*|decision\w*)\b",
        "trust": r"\b(trust\w*|distrust\w*|psycholog\w*\s*safety|safe\w*|vulnerab\w*)\b",
        "conflict": r"\b(conflict\w*|friction|tension\w*|disagree\w*|dispute\w*)\b",
        "teamwork": r"\b(team\w*|collaborat\w*|cooperat\w*|together\w*|group\w*)\b",
        "deadlines": r"\b(deadline\w*|timeline\w*|schedule\w*|deliver\w*|due\s*date\w*|miss\w*)\b",
        "roles": r"\b(role\w*|responsib\w*|accountab\w*|clarif\w*|unclear\w*)\b",
        "silos": r"\b(silo\w*|department\w*|cross.?functional\w*|coordinat\w*)\b",
        "culture": r"\b(cultur\w*|norm\w*|value\w*|climate\w*|environment\w*)\b",
        "performance": r"\b(perform\w*|productiv\w*|efficien\w*|effectiv\w*|outcome\w*)\b",
    }

    text_lower = text.lower()
    themes = []

    for theme_name, pattern in theme_patterns.items():
        matches = re.findall(pattern, text_lower)
        if matches:
            themes.append({
                "theme": theme_name,
                "frequency": len(matches),
                "examples": list(set(matches))[:5],  # Up to 5 unique examples
            })

    # Sort by frequency
    themes = sorted(themes, key=lambda x: x["frequency"], reverse=True)

    # Also extract the most common words for additional context
    words = re.findall(r"\b[a-z]{4,}\b", text_lower)
    # Filter out common stop words
    stop_words = {"that", "this", "with", "from", "have", "were", "been", "they", "their", "about", "would", "could", "should", "which", "there", "being", "because", "didn", "wasn", "doesn", "people"}
    words = [w for w in words if w not in stop_words]
    word_counts = Counter(words).most_common(20)

    warnings = []

    # Add warning about automated theme extraction
    warnings.append({
        "type": "methodology",
        "message": "Themes extracted using pattern matching. For rigorous analysis, consider manual coding with inter-rater reliability.",
        "severity": "medium",
    })

    # Count approximate entries/segments
    segments = text.split("\n\n")
    segments = [s for s in segments if s.strip()]

    if len(segments) < 5:
        warnings.append({
            "type": "sample_size",
            "message": f"Only {len(segments)} text segments found. Consider whether this represents adequate data saturation.",
            "severity": "medium",
        })

    if not themes:
        summary = "No common themes detected. The text may not contain organizational research-related content."
    else:
        top_themes = [t["theme"] for t in themes[:3]]
        summary = f"Identified {len(themes)} recurring themes across {len(segments)} text segments. Top themes: {', '.join(top_themes)}."

    return AnalysisResult(
        type="theme",
        summary=summary,
        details={
            "themes": themes,
            "common_words": [{"word": w, "count": c} for w, c in word_counts],
            "segment_count": len(segments),
        },
        rigor_warnings=warnings,
    )


# PDF document analysis
class PDFSummary(BaseModel):
    filename: str
    pages: int
    text_length: int
    text_preview: str
    file_type: str = "pdf"


@app.post("/analyze/pdf", response_model=PDFSummary)
async def analyze_pdf(file: UploadFile = File(...)):
    """Extract text from a PDF document for analysis."""
    content = await file.read()
    filename = file.filename or "document.pdf"

    try:
        import pdfplumber
        from io import BytesIO

        buffer = BytesIO(content)
        text_parts = []
        page_count = 0

        with pdfplumber.open(buffer) as pdf:
            page_count = len(pdf.pages)
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)

        full_text = "\n\n".join(text_parts)

        # Create a preview (first 500 characters)
        preview = full_text[:500] + "..." if len(full_text) > 500 else full_text

        return PDFSummary(
            filename=filename,
            pages=page_count,
            text_length=len(full_text),
            text_preview=preview,
        )
    except ImportError:
        # Fallback to basic PDF parsing if pdfplumber not available
        try:
            import fitz  # PyMuPDF
            from io import BytesIO

            buffer = BytesIO(content)
            doc = fitz.open(stream=buffer, filetype="pdf")
            page_count = len(doc)
            text_parts = []

            for page in doc:
                text_parts.append(page.get_text())

            full_text = "\n\n".join(text_parts)
            preview = full_text[:500] + "..." if len(full_text) > 500 else full_text

            return PDFSummary(
                filename=filename,
                pages=page_count,
                text_length=len(full_text),
                text_preview=preview,
            )
        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="PDF parsing libraries not available. Please install pdfplumber or PyMuPDF."
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
