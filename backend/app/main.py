import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import catalog, dev, economy, learners, lessons, social
from .config import settings
from .core.errors import install_error_handlers
from .db.bootstrap import initialise_database

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await initialise_database()
    yield


def create_app() -> FastAPI:
    application = FastAPI(title='Duolingo Clone API', version='2.0.0', lifespan=lifespan)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
    )
    install_error_handlers(application)

    api = APIRouter(prefix='/api')
    for module in (learners, catalog, lessons, economy, social):
        api.include_router(module.router)
    if settings.DEV_TOOLS:
        api.include_router(dev.router)

    @api.get('/health', tags=['meta'])
    async def health():
        return {'ok': True, 'name': 'Duolingo Clone API', 'stack': 'FastAPI + SQLite'}

    application.include_router(api)
    return application


app = create_app()
