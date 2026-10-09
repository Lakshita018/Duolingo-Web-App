from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    DATABASE_URL: str = 'sqlite+aiosqlite:///./duolingo.db'
    CORS_ORIGINS: str = '*'
    TIMEZONE: str | None = None
    DEV_TOOLS: bool = True
    BACKUP_BEFORE_MIGRATE: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(',') if origin.strip()]


settings = Settings()
