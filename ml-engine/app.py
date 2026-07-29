import os
import joblib
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify

app = Flask(__name__)

# ─── Load all trained model pipelines ──────────────────────────────────────────
MODELS = {}

def load_models():
    model_files = {
        'isolation_forest': 'models/isolation_forest.pkl',
        'random_forest':    'models/random_forest.pkl',
        'xgboost':          'models/xgboost.pkl',
    }
    for name, path in model_files.items():
        if os.path.exists(path):
            MODELS[name] = joblib.load(path)
            print(f"[ML Engine] Loaded: {name}")
        else:
            print(f"[ML Engine] WARNING: Model not found at {path}. Run train.py first.")

load_models()

# ─── Feature columns expected (must match train.py feature engineering) ─────────
FEATURE_COLS = [
    'duration', 'protocol_type', 'service', 'flag',
    'src_bytes', 'dst_bytes', 'land', 'wrong_fragment',
    'urgent', 'hot', 'num_failed_logins', 'logged_in',
    'num_compromised', 'root_shell', 'su_attempted', 'num_root',
    'num_file_creations', 'num_shells', 'num_access_files',
    'num_outbound_cmds', 'is_host_login', 'is_guest_login',
    'count', 'srv_count', 'serror_rate', 'srv_serror_rate',
    'rerror_rate', 'srv_rerror_rate', 'same_srv_rate',
    'diff_srv_rate', 'srv_diff_host_rate', 'dst_host_count',
    'dst_host_srv_count', 'dst_host_same_srv_rate',
    'dst_host_diff_srv_rate', 'dst_host_same_src_port_rate',
    'dst_host_srv_diff_host_rate', 'dst_host_serror_rate',
    'dst_host_srv_serror_rate', 'dst_host_rerror_rate',
    'dst_host_srv_rerror_rate'
]

def build_feature_row(log: dict) -> dict:
    """Map incoming log dict to KDD-compatible feature row with safe defaults."""
    return {
        'duration':                  log.get('duration', 0),
        'protocol_type':             log.get('protocol_type', 'tcp'),
        'service':                   log.get('service', 'http'),
        'flag':                      log.get('flag', 'SF'),
        'src_bytes':                 log.get('bytes_in', log.get('src_bytes', 0)),
        'dst_bytes':                 log.get('bytes_out', log.get('dst_bytes', 0)),
        'land':                      log.get('land', 0),
        'wrong_fragment':            log.get('wrong_fragment', 0),
        'urgent':                    log.get('urgent', 0),
        'hot':                       log.get('hot', 0),
        'num_failed_logins':         log.get('failed_logins', log.get('num_failed_logins', 0)),
        'logged_in':                 log.get('logged_in', 1),
        'num_compromised':           log.get('num_compromised', 0),
        'root_shell':                log.get('root_shell', 0),
        'su_attempted':              log.get('su_attempted', 0),
        'num_root':                  log.get('num_root', 0),
        'num_file_creations':        log.get('num_file_creations', 0),
        'num_shells':                log.get('num_shells', 0),
        'num_access_files':          log.get('num_access_files', 0),
        'num_outbound_cmds':         log.get('num_outbound_cmds', 0),
        'is_host_login':             log.get('is_host_login', 0),
        'is_guest_login':            log.get('is_guest_login', 0),
        'count':                     log.get('count', 1),
        'srv_count':                 log.get('srv_count', 1),
        'serror_rate':               log.get('serror_rate', 0.0),
        'srv_serror_rate':           log.get('srv_serror_rate', 0.0),
        'rerror_rate':               log.get('rerror_rate', 0.0),
        'srv_rerror_rate':           log.get('srv_rerror_rate', 0.0),
        'same_srv_rate':             log.get('same_srv_rate', 1.0),
        'diff_srv_rate':             log.get('diff_srv_rate', 0.0),
        'srv_diff_host_rate':        log.get('srv_diff_host_rate', 0.0),
        'dst_host_count':            log.get('dst_host_count', 1),
        'dst_host_srv_count':        log.get('dst_host_srv_count', 1),
        'dst_host_same_srv_rate':    log.get('dst_host_same_srv_rate', 1.0),
        'dst_host_diff_srv_rate':    log.get('dst_host_diff_srv_rate', 0.0),
        'dst_host_same_src_port_rate': log.get('dst_host_same_src_port_rate', 1.0),
        'dst_host_srv_diff_host_rate': log.get('dst_host_srv_diff_host_rate', 0.0),
        'dst_host_serror_rate':      log.get('dst_host_serror_rate', 0.0),
        'dst_host_srv_serror_rate':  log.get('dst_host_srv_serror_rate', 0.0),
        'dst_host_rerror_rate':      log.get('dst_host_rerror_rate', 0.0),
        'dst_host_srv_rerror_rate':  log.get('dst_host_srv_rerror_rate', 0.0),
    }

def score_to_risk(score: float) -> int:
    """Normalise model decision score to a 0-100 integer risk score."""
    return max(0, min(100, int((0.5 - score) * 100)))


# ─── Routes ─────────────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'models_loaded': list(MODELS.keys()),
        'total_models': len(MODELS)
    })


@app.route('/predict/anomaly', methods=['POST'])
def predict_anomaly():
    """
    Accepts a JSON body with a 'logs' array.
    Each log can include any subset of KDD network features.
    Returns per-log anomaly results fusing all loaded models.
    """
    if not MODELS:
        return jsonify({'error': 'No trained models loaded. Run train.py first.'}), 503

    data = request.get_json(silent=True)
    if not data or not data.get('logs'):
        return jsonify({'error': 'Request body must contain a non-empty "logs" array.'}), 400

    rows = [build_feature_row(log) for log in data['logs']]
    df = pd.DataFrame(rows)

    results = []

    # ── Isolation Forest ──────────────────────────────────────────────────────
    iso_preds  = None
    iso_scores = None
    if 'isolation_forest' in MODELS:
        iso_preds  = MODELS['isolation_forest'].predict(df)           # -1 = anomaly
        iso_scores = MODELS['isolation_forest'].decision_function(df)  # lower = more anomalous

    # ── Random Forest ─────────────────────────────────────────────────────────
    rf_probs = None
    if 'random_forest' in MODELS:
        rf_probs = MODELS['random_forest'].predict_proba(df)[:, 1]   # P(attack)

    # ── XGBoost ───────────────────────────────────────────────────────────────
    xgb_probs = None
    if 'xgboost' in MODELS:
        xgb_probs = MODELS['xgboost'].predict_proba(df)[:, 1]        # P(attack)

    for i in range(len(rows)):
        scores = []
        is_anomaly_flags = []

        if iso_scores is not None:
            iso_risk = score_to_risk(float(iso_scores[i]))
            scores.append(iso_risk)
            is_anomaly_flags.append(bool(iso_preds[i] == -1))

        if rf_probs is not None:
            rf_risk = int(rf_probs[i] * 100)
            scores.append(rf_risk)
            is_anomaly_flags.append(rf_probs[i] > 0.5)

        if xgb_probs is not None:
            xgb_risk = int(xgb_probs[i] * 100)
            scores.append(xgb_risk)
            is_anomaly_flags.append(xgb_probs[i] > 0.5)

        # Ensemble: average all model scores + majority vote for anomaly
        ensemble_risk  = int(np.mean(scores)) if scores else 0
        is_anomaly     = (sum(is_anomaly_flags) > len(is_anomaly_flags) / 2)

        # Threat level classification
        if ensemble_risk >= 75:
            threat_level = 'critical'
        elif ensemble_risk >= 50:
            threat_level = 'high'
        elif ensemble_risk >= 25:
            threat_level = 'medium'
        else:
            threat_level = 'low'

        results.append({
            'is_anomaly':    is_anomaly,
            'risk_score':    ensemble_risk,
            'threat_level':  threat_level,
            'model_scores': {
                'isolation_forest': int(scores[0]) if iso_scores is not None else None,
                'random_forest':    int(scores[1]) if rf_probs  is not None else None,
                'xgboost':          int(scores[2]) if xgb_probs is not None else None,
            }
        })

    return jsonify({'results': results, 'total': len(results)})


@app.route('/predict/classify', methods=['POST'])
def classify_threat():
    """Single-log detailed threat classification using XGBoost + Random Forest."""
    if 'xgboost' not in MODELS and 'random_forest' not in MODELS:
        return jsonify({'error': 'Classification models not loaded.'}), 503

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Request body required.'}), 400

    df = pd.DataFrame([build_feature_row(data)])

    rf_confidence  = float(MODELS['random_forest'].predict_proba(df)[0, 1])  if 'random_forest' in MODELS else 0.0
    xgb_confidence = float(MODELS['xgboost'].predict_proba(df)[0, 1])        if 'xgboost'       in MODELS else 0.0

    avg_confidence = (rf_confidence + xgb_confidence) / 2

    return jsonify({
        'is_threat':         avg_confidence > 0.5,
        'confidence':        round(avg_confidence, 4),
        'risk_score':        int(avg_confidence * 100),
        'rf_confidence':     round(rf_confidence,  4),
        'xgb_confidence':    round(xgb_confidence, 4),
    })


if __name__ == '__main__':
    port = int(os.environ.get('ML_PORT', 5001))
    print(f"[ML Engine] Starting on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
