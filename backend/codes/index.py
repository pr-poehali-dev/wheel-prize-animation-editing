import json
import os
import random
import string

import psycopg2


def _cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    }


def _gen_code():
    part = lambda: ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f'BRICK-{part()}-{part()}'


def handler(event: dict, context) -> dict:
    '''Управление кодами на количество бриков: список, создание, удаление'''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors_headers(), 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    try:
        if method == 'GET':
            cur.execute(
                'SELECT id, code, quantity, status, '
                "to_char(created_at, 'DD.MM') FROM brick_codes ORDER BY created_at DESC"
            )
            rows = cur.fetchall()
            codes = [
                {'id': r[0], 'code': r[1], 'quantity': r[2], 'status': r[3], 'created': r[4]}
                for r in rows
            ]
            return {
                'statusCode': 200,
                'headers': {**_cors_headers(), 'Content-Type': 'application/json'},
                'body': json.dumps({'codes': codes}),
            }

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            quantity = int(body.get('quantity') or 1)
            code = _gen_code()
            cur.execute(
                'INSERT INTO brick_codes (code, quantity) VALUES (%s, %s) '
                "RETURNING id, code, quantity, status, to_char(created_at, 'DD.MM')",
                (code, quantity),
            )
            r = cur.fetchone()
            conn.commit()
            return {
                'statusCode': 200,
                'headers': {**_cors_headers(), 'Content-Type': 'application/json'},
                'body': json.dumps(
                    {'id': r[0], 'code': r[1], 'quantity': r[2], 'status': r[3], 'created': r[4]}
                ),
            }

        if method == 'DELETE':
            params = event.get('queryStringParameters') or {}
            code_id = int(params.get('id') or 0)
            cur.execute('DELETE FROM brick_codes WHERE id = %s', (code_id,))
            conn.commit()
            return {
                'statusCode': 200,
                'headers': {**_cors_headers(), 'Content-Type': 'application/json'},
                'body': json.dumps({'ok': True}),
            }

        return {
            'statusCode': 405,
            'headers': _cors_headers(),
            'body': json.dumps({'error': 'method not allowed'}),
        }
    finally:
        cur.close()
        conn.close()
