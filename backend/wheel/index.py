import json
import os
import psycopg2


def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    }


def _json(data, status=200):
    return {
        'statusCode': status,
        'headers': {**_cors(), 'Content-Type': 'application/json'},
        'body': json.dumps(data, ensure_ascii=False),
    }


def handler(event: dict, context) -> dict:
    '''Активация промокода и управление балансом бриков колеса'''
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    body = json.loads(event.get('body') or '{}')
    action = body.get('action') or event.get('queryStringParameters', {}).get('action', '')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    try:
        if method == 'POST' and action == 'activate':
            code = (body.get('code') or '').strip().upper()
            session_id = body.get('session_id') or ''
            if not code:
                return _json({'error': 'Введи код'}, 400)

            cur.execute(
                "SELECT id, quantity, status FROM brick_codes WHERE code = %s",
                (code,)
            )
            row = cur.fetchone()
            if not row:
                return _json({'error': 'Код не найден'}, 404)
            code_id, quantity, status = row
            if status != 'active':
                return _json({'error': 'Код уже использован'}, 400)

            cur.execute(
                "UPDATE brick_codes SET status = 'used' WHERE id = %s",
                (code_id,)
            )

            cur.execute(
                "INSERT INTO spin_sessions (session_id, balance) VALUES (%s, %s) "
                "ON CONFLICT (session_id) DO UPDATE SET balance = spin_sessions.balance + %s "
                "RETURNING balance",
                (session_id, quantity, quantity)
            )
            new_balance = cur.fetchone()[0]
            conn.commit()
            return _json({'ok': True, 'added': quantity, 'balance': new_balance})

        if method == 'POST' and action == 'spin':
            session_id = body.get('session_id') or ''
            SPIN_COST = 10
            cur.execute(
                "SELECT balance FROM spin_sessions WHERE session_id = %s",
                (session_id,)
            )
            row = cur.fetchone()
            balance = row[0] if row else 0
            if balance < SPIN_COST:
                return _json({'error': f'Недостаточно бриков. Нужно {SPIN_COST}, у тебя {balance}'}, 400)

            cur.execute(
                "UPDATE spin_sessions SET balance = balance - %s WHERE session_id = %s RETURNING balance",
                (SPIN_COST, session_id)
            )
            new_balance = cur.fetchone()[0]

            import random
            prizes = [
                {'label': 'Ничего', 'emoji': '😶', 'weight': 35},
                {'label': 'Стикер', 'emoji': '🎨', 'weight': 25},
                {'label': 'VPN', 'emoji': '🛡️', 'weight': 20},
                {'label': 'Промокод', 'emoji': '🎟️', 'weight': 12},
                {'label': 'Дойти', 'emoji': '⚡', 'weight': 5},
                {'label': 'Админка', 'emoji': '👑', 'weight': 3},
            ]
            weights = [p['weight'] for p in prizes]
            result = random.choices(prizes, weights=weights, k=1)[0]

            cur.execute(
                "INSERT INTO spin_results (session_id, prize) VALUES (%s, %s)",
                (session_id, result['label'])
            )
            conn.commit()
            return _json({'ok': True, 'prize': result, 'balance': new_balance})

        if method == 'GET':
            session_id = (event.get('queryStringParameters') or {}).get('session_id', '')
            balance = 0
            if session_id:
                cur.execute("SELECT balance FROM spin_sessions WHERE session_id = %s", (session_id,))
                row = cur.fetchone()
                balance = row[0] if row else 0

            cur.execute(
                "SELECT session_id, prize, to_char(created_at, 'DD.MM HH24:MI') "
                "FROM spin_results ORDER BY created_at DESC LIMIT 20"
            )
            results = [{'session_id': r[0][:8] + '...', 'prize': r[1], 'time': r[2]} for r in cur.fetchall()]
            return _json({'balance': balance, 'results': results})

        return _json({'error': 'unknown'}, 400)
    finally:
        cur.close()
        conn.close()
