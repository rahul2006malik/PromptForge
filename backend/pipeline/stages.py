"""
Pipeline stage functions.

Each function:
  - Takes the current prompt + accumulated state
  - Makes one focused LLM call
  - Returns a typed dict (StageResult)
  - Does NOT catch exceptions — caller handles errors and SSE error events
"""

from backend.pipeline.client import call_llm_json
from backend.pipeline import prompts


def run_diagnosis(prompt: str, model: str) -> dict:
    """
    Stage 0: Diagnose the weak prompt.
    Returns: weaknesses, initial_scores, detected_domain, diagnosis_summary
    """
    result = call_llm_json(
        model=model,
        system_prompt=prompts.DIAGNOSIS_SYSTEM,
        user_message=f"Diagnose this prompt:\n\n{prompt}",
    )
    return {
        "stage": "diagnosis",
        "weaknesses": result.get("weaknesses", []),
        "initial_scores": result.get("initial_scores", {}),
        "detected_domain": result.get("detected_domain", "general"),
        "diagnosis_summary": result.get("diagnosis_summary", ""),
    }


def run_context_stage(original_prompt: str, diagnosis: dict, model: str) -> dict:
    """
    Stage 1: Enrich with context.
    Returns: improved_prompt, changes, reasoning, scores
    """
    user_msg = prompts.build_context_user_message(original_prompt, diagnosis)
    result = call_llm_json(
        model=model,
        system_prompt=prompts.CONTEXT_SYSTEM,
        user_message=user_msg,
    )
    return {
        "stage": "context",
        "stage_index": 1,
        "stage_label": "Context Enrichment",
        "improved_prompt": result.get("improved_prompt", ""),
        "changes": result.get("changes", []),
        "reasoning": result.get("reasoning", ""),
        "scores": result.get("scores", {}),
    }


def run_role_stage(context_result: dict, diagnosis: dict, model: str) -> dict:
    """
    Stage 2: Assign expert role/persona.
    Returns: improved_prompt, changes, reasoning, scores
    """
    user_msg = prompts.build_role_user_message(
        context_result["improved_prompt"], diagnosis
    )
    result = call_llm_json(
        model=model,
        system_prompt=prompts.ROLE_SYSTEM,
        user_message=user_msg,
    )
    return {
        "stage": "role",
        "stage_index": 2,
        "stage_label": "Role Definition",
        "improved_prompt": result.get("improved_prompt", ""),
        "changes": result.get("changes", []),
        "reasoning": result.get("reasoning", ""),
        "scores": result.get("scores", {}),
    }


def run_constraint_stage(role_result: dict, diagnosis: dict, model: str) -> dict:
    """
    Stage 3: Add output constraints and quality guardrails.
    Returns: improved_prompt, changes, reasoning, scores
    """
    user_msg = prompts.build_constraint_user_message(
        role_result["improved_prompt"], diagnosis
    )
    result = call_llm_json(
        model=model,
        system_prompt=prompts.CONSTRAINT_SYSTEM,
        user_message=user_msg,
    )
    return {
        "stage": "constraint",
        "stage_index": 3,
        "stage_label": "Constraint Addition",
        "improved_prompt": result.get("improved_prompt", ""),
        "changes": result.get("changes", []),
        "reasoning": result.get("reasoning", ""),
        "scores": result.get("scores", {}),
    }


def run_best_version_stage(
    original_prompt: str,
    context_result: dict,
    role_result: dict,
    constraint_result: dict,
    diagnosis: dict,
    model: str,
) -> dict:
    """
    Stage 4: Synthesize the best final prompt.
    Returns: best_prompt, synthesis_notes, final_scores, overall_score
    """
    user_msg = prompts.build_best_version_user_message(
        original_prompt,
        context_result,
        role_result,
        constraint_result,
        diagnosis,
    )
    result = call_llm_json(
        model=model,
        system_prompt=prompts.BEST_VERSION_SYSTEM,
        user_message=user_msg,
    )
    return {
        "stage": "best",
        "stage_index": 4,
        "stage_label": "Best Version",
        "best_prompt": result.get("best_prompt", ""),
        "synthesis_notes": result.get("synthesis_notes", []),
        "final_scores": result.get("final_scores", {}),
        "overall_score": result.get("overall_score", 0),
    }
