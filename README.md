# ArtSide

ArtSide - веб-платформа для публикации, просмотра, поиска и сохранения цифровых художественных работ. Проект разрабатывается как fullstack-приложение на Next.js: клиентские страницы, API, работа с базой данных и загрузка изображений находятся в одном репозитории.

## Стек

- Next.js 16 App Router
- React 19
- TypeScript
- Prisma ORM
- SQLite для локальной разработки
- JWT-сессии в `httpOnly` cookies
- bcryptjs для хеширования паролей
- Nodemailer для восстановления пароля по email
- локальное хранилище изображений или S3/R2-совместимое хранилище

## Возможности

- главная лента с популярными работами и рекомендациями;
- поиск в стиле Pinterest: выпадающие подсказки, недавние запросы и обновление главной ленты по выбранному запросу;
- фильтрация и сортировка результатов поиска по категории, тегам, автору, новизне и популярности;
- регистрация, вход, выход и проверка текущей сессии;
- восстановление пароля по email;
- публичный профиль автора;
- профессиональный профиль: навыки, программы, форматы работы, публичный email и ссылки;
- настройки профиля и аккаунта;
- подготовка профиля автора на `/publish/setup`;
- публикация и редактирование работ на `/publish`;
- главное изображение, отдельная миниатюра и до 8 изображений в одной работе;
- статусы работ: `draft`, `pending`, `published`, `rejected`;
- базовая предварительная модерация через `/api/works/[workId]/moderate`;
- скрытие черновиков, работ на проверке и отклоненных работ от других пользователей;
- лайки, комментарии, просмотры и закрепленные работы;
- сохранение работ в библиотеку и папки;
- уведомления с признаком прочтения.

## Переменные окружения

Создайте `.env` на основе `.env.example`:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-a-long-random-secret"
APP_URL="http://localhost:3000"
APP_NAME="ArtSide"

# SMTP используется для писем восстановления пароля.
SMTP_HOST=""
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASS=""
MAIL_FROM="ArtSide <no-reply@example.com>"

# Необязательное S3/R2-совместимое хранилище изображений.
# Если переменные не заданы, файлы сохраняются локально в public/uploads.
S3_BUCKET=""
S3_REGION="auto"
S3_ENDPOINT=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_PUBLIC_BASE_URL=""
```

`AUTH_SECRET` обязателен для production. SMTP-переменные нужны для полноценной отправки писем восстановления пароля. Если `S3_*` не заполнены, загруженные изображения сохраняются локально в `public/uploads`.

## Локальный запуск

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run db:seed # необязательно, демо-работы для локальной разработки
npm run dev
```

После запуска откройте `http://localhost:3000`.

В проекте также настроен `postinstall: prisma generate`, поэтому Prisma Client генерируется после `npm install`. Явный шаг `npm run prisma:generate` оставлен в инструкции, чтобы свежая установка не ломалась при сборке или миграциях.

## База данных

Схема базы данных находится в `prisma/schema.prisma`.

Актуальная ER-диаграмма находится в [`docs/er-diagram.md`](docs/er-diagram.md).

Сгенерировать Prisma Client:

```bash
npm run prisma:generate
```

Применить локальные миграции:

```bash
npm run prisma:migrate
```

Открыть Prisma Studio:

```bash
npm run db:studio
```

Локальная SQLite-база `prisma/dev.db` игнорируется Git и не должна попадать в репозиторий.

## Демо-данные

Демо-контент вынесен в отдельный seed-скрипт:

```bash
npm run db:seed
```

Seed нужен только для локального наполнения проекта тестовыми пользователями и работами. Production-логика не должна создавать демо-данные во время обычных запросов.

## Публикация и модерация

У работ используется четыре статуса:

- `draft` - черновик, виден только владельцу;
- `pending` - работа отправлена на предварительную проверку;
- `published` - работа опубликована и видна всем пользователям;
- `rejected` - работа отклонена базовой проверкой.

При нажатии кнопки публикации работа сначала получает статус `pending`. Затем владелец может запустить проверку через `POST /api/works/[workId]/moderate`. На текущем этапе проверка rule-based: наличие изображения, описание, подозрительное название, запрещенные слова и качество тегов. Модуль спроектирован так, чтобы позже заменить правила на ИИ-модель без изменения основного API публикации.

Основные файлы:

- `src/lib/content-moderation.ts` - правила проверки контента;
- `src/lib/moderation-store.ts` - получение работы, запуск проверки и обновление статуса;
- `src/app/api/works/[workId]/moderate/route.ts` - API для запуска проверки.

## Основные скрипты

- `npm run dev` - запуск dev-сервера;
- `npm run build` - production-сборка;
- `npm run start` - запуск production-сервера;
- `npm run lint` - проверка ESLint;
- `npm run prisma:generate` - генерация Prisma Client;
- `npm run prisma:migrate` - применение локальных миграций Prisma;
- `npm run db:seed` - создание демо-контента;
- `npm run db:studio` - запуск Prisma Studio.

## Основные API

Авторизация:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`

Аккаунт:

- `PATCH /api/account`

Профиль:

- `GET /api/profile`
- `PATCH /api/profile`
- `GET /api/profile/[username]`

Работы:

- `GET /api/home-feed`
- `POST /api/works`
- `GET /api/works/[workId]`
- `PATCH /api/works/[workId]`
- `DELETE /api/works/[workId]`
- `POST /api/works/[workId]/moderate`
- `PATCH /api/works/[workId]/featured`
- `POST /api/works/[workId]/like`
- `DELETE /api/works/[workId]/like`
- `POST /api/works/[workId]/comments`
- `POST /api/works/[workId]/view`

Поиск:

- `GET /api/search`

Библиотека и сохранения:

- `GET /api/library`
- `GET /api/saved-works`
- `POST /api/saved-works`
- `DELETE /api/saved-works/[workId]`

Уведомления:

- `GET /api/notifications`
- `POST /api/notifications/read-all`

## Очистка локальных артефактов

Основной вес локального проекта обычно занимают `node_modules` и `.next`.

Безопасно удалить кэш Next.js и dev-логи:

```powershell
Remove-Item -Recurse -Force .next
Remove-Item -Force .next-dev*.log
```

`node_modules` также можно удалить, если нужно освободить место, но после этого потребуется снова выполнить `npm install`.

## Важные локальные файлы

Git игнорирует:

- `.next/`;
- `node_modules/`;
- `.env`;
- `prisma/dev.db`;
- `public/uploads/*`;
- `.next-dev*.log`.

Эти файлы относятся к локальной разработке и не должны попадать в репозиторий.
