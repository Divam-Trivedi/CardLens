import json, os
from typing import Dict, Optional

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "card_configs.json")

def load_card_config(card_id: str):
    with open(CONFIG_PATH) as f:
        configs = json.load(f)
    for card in configs["cards"]:
        if card["id"] == card_id:
            return card
    return None

def calculate_reward(amount, category, card_id, ytd_spend=None):
    config = load_card_config(card_id)
    if not config:
        return 0.0, 0.01

    if ytd_spend is None:
        ytd_spend = {}

    is_points = config.get("reward_type") == "points"
    point_value_cents = config.get("point_value_cents", 1.0)
    preferred_bonus = config.get("preferred_rewards_bonus", 0.0)

    for rule in config["reward_rules"]:
        categories = rule["categories"]
        matches = categories == ["*"] or category in categories

        if matches:
            rate = rule["rate"]
            cap_key = rule.get("cap_category")

            if cap_key:
                cap_annual = rule.get("cap_annual")
                if cap_annual:
                    spent_so_far = ytd_spend.get(cap_key, 0.0)
                    if spent_so_far >= cap_annual:
                        rate = 1 if is_points else 0.01
                    elif spent_so_far + amount > cap_annual:
                        eligible = cap_annual - spent_so_far
                        ytd_spend[cap_key] = cap_annual
                        if is_points:
                            points_eligible = eligible * rate
                            points_over = (amount - eligible) * 1
                            total_points = points_eligible + points_over
                            reward_value = total_points * point_value_cents / 100
                            return round(reward_value, 4), round(total_points / amount, 4)
                        else:
                            reward_eligible = eligible * rate * (1 + preferred_bonus)
                            reward_over = (amount - eligible) * 0.01 * (1 + preferred_bonus)
                            return round(reward_eligible + reward_over, 4), rate
                    ytd_spend[cap_key] = spent_so_far + amount

            if is_points:
                points_earned = amount * rate
                reward_value = points_earned * point_value_cents / 100
                return round(reward_value, 4), rate
            else:
                reward = amount * rate * (1 + preferred_bonus)
                return round(reward, 4), rate

    # Default
    if is_points:
        return round(amount * point_value_cents / 100, 4), 1.0
    return round(amount * 0.01 * (1 + preferred_bonus), 4), 0.01

def calculate_rewards_for_statement(transactions, card_id):
    ytd_spend = {}
    result = []
    for txn in sorted(transactions, key=lambda t: t.get("date", "")):
        reward, rate = calculate_reward(txn["amount"], txn.get("category", "Other"), card_id, ytd_spend)
        enriched = dict(txn)
        enriched["reward_earned"] = reward
        enriched["reward_rate"] = rate
        result.append(enriched)
    return result