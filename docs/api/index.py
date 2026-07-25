"""
Vercel Python Serverless entry point.
Wraps the Flask WSGI app for Vercel's @vercel/python runtime.
"""
from app import create_app

app = create_app()
