# Swimlane диаграммы (полное покрытие проекта)

Формат: Mermaid (flowchart + swimlane через `subgraph`).

## 1) Авторизация + восстановление сессии

```mermaid
flowchart LR
  %% Lanes
  subgraph U["Пользователь"]
    U_open["Открывает приложение / вводит email+password"]
  end

  subgraph A["Мобильное приложение (React Native)"]
    A_boot["Старт приложения"]
    A_mmkv_get["MMKV: getToken()/getUser()"]
    A_login_req["POST /api/auth/login\n(email,password)"]
    A_register_req["POST /api/auth/register\n(username,email,password,name)"]
    A_store_auth["Redux: login()\nсохранение токена в MMKV"]
    A_me_req["GET /api/auth/me\nBearer token"]
    A_logout_req["POST /api/auth/logout\nBearer token"]
    A_clear_auth["Redux: logout()\nудаление токена из MMKV"]
  end

  subgraph API["API сервер (Express)"]
    API_auth_routes["/api/auth/* routes"]
    API_auth_mw["authMiddleware\nJWT verify + req.userId"]
    API_auth_ctrl["authController\nregister/login/logout/getMe"]
  end

  subgraph DB["PostgreSQL (Sequelize)"]
    DB_user["User\nfindOne/findByPk/create/update"]
  end

  %% Boot flow
  U_open --> A_boot --> A_mmkv_get
  A_mmkv_get -- "есть token" --> A_me_req --> API_auth_routes --> API_auth_mw --> API_auth_ctrl --> DB_user --> API_auth_ctrl --> A_store_auth
  A_mmkv_get -- "нет token" --> A_login_req --> API_auth_routes --> API_auth_ctrl --> DB_user --> API_auth_ctrl --> A_store_auth

  %% Register flow
  U_open --> A_register_req --> API_auth_routes --> API_auth_ctrl --> DB_user --> API_auth_ctrl --> A_store_auth

  %% Logout flow
  U_open --> A_logout_req --> API_auth_routes --> API_auth_mw --> API_auth_ctrl --> DB_user --> API_auth_ctrl --> A_clear_auth
```

## 2) Лента, посты, загрузка картинки, лайки, комментарии

```mermaid
flowchart LR
  subgraph U["Пользователь"]
    U_feed["Открывает ленту"]
    U_new_post["Создает пост (текст/картинка)"]
    U_like["Ставит/снимает лайк"]
    U_comments["Открывает/пишет комментарии"]
  end

  subgraph A["Мобильное приложение (React Native)"]
    A_fetch_feed["GET /api/posts/feed\n(Bearer token)"]
    A_pick_image["Выбирает фото из галереи\nreact-native-image-picker"]
    A_upload["POST /api/upload\nmultipart/form-data(image)"]
    A_create_post["POST /api/posts\n{content,image?}"]
    A_toggle_like["POST /api/posts/:postId/toggle-like"]
    A_get_comments["GET /api/posts/:postId/comments"]
    A_create_comment["POST /api/posts/:postId/comments\n{content}"]
  end

  subgraph API["API сервер (Express)"]
    API_posts_routes["/api/posts/* routes"]
    API_upload_route["/api/upload route\n(multer -> uploads/)"]
    API_auth_mw["authMiddleware\nJWT verify + req.userId"]
    API_post_ctrl["postController\ncreatePost/getFeed/getUserPosts/deletePost/toggleLike"]
    API_comment_ctrl["commentController\ncreateComment/getComments"]
  end

  subgraph FS["Файловая система"]
    FS_uploads["server/uploads\nфайл сохраняется + отдаётся /uploads/*"]
  end

  subgraph DB["PostgreSQL (Sequelize)"]
    DB_post["Post"]
    DB_like["Like"]
    DB_comment["Comment"]
    DB_user["User + Follow\n(для ленты: Following + self)"]
  end

  %% Feed
  U_feed --> A_fetch_feed --> API_posts_routes --> API_auth_mw --> API_post_ctrl --> DB_user --> DB_post --> DB_like --> DB_comment --> API_post_ctrl --> A_fetch_feed

  %% Create post with image upload
  U_new_post --> A_pick_image --> A_upload --> API_upload_route --> FS_uploads --> API_upload_route --> A_create_post
  A_create_post --> API_posts_routes --> API_auth_mw --> API_post_ctrl --> DB_post --> DB_user --> API_post_ctrl --> A_create_post

  %% Like/unlike (toggle)
  U_like --> A_toggle_like --> API_posts_routes --> API_auth_mw --> API_post_ctrl --> DB_like --> DB_post --> API_post_ctrl --> A_toggle_like

  %% Comments
  U_comments --> A_get_comments --> API_posts_routes --> API_auth_mw --> API_comment_ctrl --> DB_comment --> DB_user --> API_comment_ctrl --> A_get_comments
  U_comments --> A_create_comment --> API_posts_routes --> API_auth_mw --> API_comment_ctrl --> DB_post --> DB_comment --> DB_user --> API_comment_ctrl --> A_create_comment
```

## 3) Пользователи: поиск, профиль, follow/unfollow, редактирование профиля

```mermaid
flowchart LR
  subgraph U["Пользователь"]
    U_search["Ищет пользователей"]
    U_open_profile["Открывает профиль"]
    U_follow["Подписывается/отписывается"]
    U_edit["Редактирует профиль (name/username/bio/avatarUrl)"]
  end

  subgraph A["Мобильное приложение (React Native)"]
    A_search["GET /api/users/search?query=..."]
    A_profile["GET /api/users/:userId/profile"]
    A_follow["POST /api/users/:targetUserId/follow"]
    A_unfollow["DELETE /api/users/:targetUserId/unfollow"]
    A_update["PUT /api/users/profile\n{name,username,bio,avatar}"]
    A_followers["GET /api/users/:userId/followers"]
    A_following["GET /api/users/:userId/following"]
  end

  subgraph API["API сервер (Express)"]
    API_users_routes["/api/users/* routes"]
    API_auth_mw["authMiddleware"]
    API_user_ctrl["userController\nsearch/getProfile/follow/unfollow/update/getFollowers/getFollowing"]
  end

  subgraph DB["PostgreSQL (Sequelize)"]
    DB_user["User"]
    DB_follow["Follow"]
    DB_post["Post (в профиле подгружается limit 10)"]
  end

  U_search --> A_search --> API_users_routes --> API_auth_mw --> API_user_ctrl --> DB_user --> API_user_ctrl --> A_search
  U_open_profile --> A_profile --> API_users_routes --> API_auth_mw --> API_user_ctrl --> DB_user --> DB_post --> DB_follow --> API_user_ctrl --> A_profile
  U_follow --> A_follow --> API_users_routes --> API_auth_mw --> API_user_ctrl --> DB_follow --> API_user_ctrl --> A_follow
  U_follow --> A_unfollow --> API_users_routes --> API_auth_mw --> API_user_ctrl --> DB_follow --> API_user_ctrl --> A_unfollow
  U_edit --> A_update --> API_users_routes --> API_auth_mw --> API_user_ctrl --> DB_user --> API_user_ctrl --> A_update
  U_open_profile --> A_followers --> API_users_routes --> API_auth_mw --> API_user_ctrl --> DB_follow --> DB_user --> API_user_ctrl --> A_followers
  U_open_profile --> A_following --> API_users_routes --> API_auth_mw --> API_user_ctrl --> DB_follow --> DB_user --> API_user_ctrl --> A_following
```

## 4) Друзья: заявки, принятие/отклонение, список, удаление

```mermaid
flowchart LR
  subgraph U["Пользователь"]
    U_send_req["Отправляет заявку в друзья"]
    U_requests["Смотрит заявки (received/sent)"]
    U_accept["Принимает заявку"]
    U_reject["Отклоняет заявку"]
    U_friends["Смотрит список друзей"]
    U_remove["Удаляет друга"]
  end

  subgraph A["Мобильное приложение (React Native)"]
    A_send_req["POST /api/friends/:targetUserId/request"]
    A_get_requests["GET /api/friends/requests?type=received|sent"]
    A_accept["PUT /api/friends/:requestId/accept"]
    A_reject["PUT /api/friends/:requestId/reject"]
    A_get_friends["GET /api/friends"]
    A_remove["DELETE /api/friends/:friendshipId"]
  end

  subgraph API["API сервер (Express)"]
    API_friends_routes["/api/friends/* routes"]
    API_auth_mw["authMiddleware"]
    API_friend_ctrl["friendshipController\nsend/getRequests/accept/reject/getFriends/remove"]
  end

  subgraph DB["PostgreSQL (Sequelize)"]
    DB_friendship["Friendship\n(status: pending/accepted/rejected)"]
    DB_user["User"]
  end

  U_send_req --> A_send_req --> API_friends_routes --> API_auth_mw --> API_friend_ctrl --> DB_user --> DB_friendship --> API_friend_ctrl --> A_send_req
  U_requests --> A_get_requests --> API_friends_routes --> API_auth_mw --> API_friend_ctrl --> DB_friendship --> DB_user --> API_friend_ctrl --> A_get_requests
  U_accept --> A_accept --> API_friends_routes --> API_auth_mw --> API_friend_ctrl --> DB_friendship --> API_friend_ctrl --> A_accept
  U_reject --> A_reject --> API_friends_routes --> API_auth_mw --> API_friend_ctrl --> DB_friendship --> API_friend_ctrl --> A_reject
  U_friends --> A_get_friends --> API_friends_routes --> API_auth_mw --> API_friend_ctrl --> DB_friendship --> DB_user --> API_friend_ctrl --> A_get_friends
  U_remove --> A_remove --> API_friends_routes --> API_auth_mw --> API_friend_ctrl --> DB_friendship --> API_friend_ctrl --> A_remove
```

## 5) Беседы (групповые): создание, список, информация, добавление участников, редактирование, выход

```mermaid
flowchart LR
  subgraph U["Пользователь"]
    U_create["Создает беседу"]
    U_list["Смотрит список бесед"]
    U_open["Открывает беседу"]
    U_add["Добавляет участников (admin)"]
    U_update["Меняет name/avatar/description (admin)"]
    U_leave["Выходит из беседы"]
  end

  subgraph A["Мобильное приложение (React Native)"]
    A_create["POST /api/conversations\n{name,memberIds,description}"]
    A_list["GET /api/conversations"]
    A_get["GET /api/conversations/:conversationId"]
    A_add["POST /api/conversations/:conversationId/members\n{memberIds[]}"]
    A_update["PUT /api/conversations/:conversationId\n{name,avatar,description}"]
    A_leave["DELETE /api/conversations/:conversationId/leave"]
  end

  subgraph API["API сервер (Express)"]
    API_conv_routes["/api/conversations/* routes"]
    API_auth_mw["authMiddleware"]
    API_conv_ctrl["conversationController\ncreate/getList/getOne/addMembers/update/leave"]
  end

  subgraph DB["PostgreSQL (Sequelize)"]
    DB_conv["Conversation"]
    DB_members["ConversationMember\n(role: admin/member)"]
    DB_user["User"]
    DB_msg["Message (для lastMessage + unreadCount)"]
  end

  U_create --> A_create --> API_conv_routes --> API_auth_mw --> API_conv_ctrl --> DB_user --> DB_conv --> DB_members --> API_conv_ctrl --> A_create
  U_list --> A_list --> API_conv_routes --> API_auth_mw --> API_conv_ctrl --> DB_members --> DB_conv --> DB_user --> DB_msg --> API_conv_ctrl --> A_list
  U_open --> A_get --> API_conv_routes --> API_auth_mw --> API_conv_ctrl --> DB_members --> DB_conv --> DB_user --> API_conv_ctrl --> A_get
  U_add --> A_add --> API_conv_routes --> API_auth_mw --> API_conv_ctrl --> DB_members --> API_conv_ctrl --> A_add
  U_update --> A_update --> API_conv_routes --> API_auth_mw --> API_conv_ctrl --> DB_members --> DB_conv --> API_conv_ctrl --> A_update
  U_leave --> A_leave --> API_conv_routes --> API_auth_mw --> API_conv_ctrl --> DB_members --> DB_conv --> API_conv_ctrl --> A_leave
```

## 6) Сообщения (REST): список чатов, история ЛС, сообщения в беседу, прочтение, удаление

```mermaid
flowchart LR
  subgraph U["Пользователь"]
    U_chats["Открывает экран сообщений"]
    U_open_dm["Открывает личный чат"]
    U_open_group["Открывает групповой чат"]
    U_send["Отправляет сообщение"]
    U_delete["Удаляет своё сообщение"]
  end

  subgraph A["Мобильное приложение (React Native)"]
    A_get_chats["GET /api/messages/chats"]
    A_get_dm["GET /api/messages/chat/:otherUserId"]
    A_get_group["GET /api/messages/conversation/:conversationId"]
    A_send["POST /api/messages/send\n{content,messageType,receiverId?conversationId?}"]
    A_mark_read["PUT /api/messages/read\n{messageIds[]}"]
    A_delete["DELETE /api/messages/:messageId"]
  end

  subgraph API["API сервер (Express)"]
    API_msg_routes["/api/messages/* routes"]
    API_auth_mw["authMiddleware"]
    API_msg_ctrl["messageController\nsend/getChats/getChatHistory/getConversationMessages/markAsRead/deleteMessage"]
  end

  subgraph DB["PostgreSQL (Sequelize)"]
    DB_msg["Message\n(isRead, senderId, receiverId, conversationId)"]
    DB_user["User"]
    DB_conv_member["ConversationMember\n(проверка членства)"]
    DB_conv["Conversation (для групповых чатов)"]
  end

  %% List chats (агрегация: личные + группы, lastMessage, unreadCount)
  U_chats --> A_get_chats --> API_msg_routes --> API_auth_mw --> API_msg_ctrl --> DB_msg --> DB_user --> DB_conv_member --> DB_conv --> API_msg_ctrl --> A_get_chats

  %% Open DM (и авто-прочтение входящих)
  U_open_dm --> A_get_dm --> API_msg_routes --> API_auth_mw --> API_msg_ctrl --> DB_msg --> DB_user --> API_msg_ctrl --> A_get_dm

  %% Open group (и авто-прочтение)
  U_open_group --> A_get_group --> API_msg_routes --> API_auth_mw --> API_msg_ctrl --> DB_conv_member --> DB_msg --> DB_user --> API_msg_ctrl --> A_get_group

  %% Send message (DM или group)
  U_send --> A_send --> API_msg_routes --> API_auth_mw --> API_msg_ctrl --> DB_conv_member --> DB_user --> DB_msg --> API_msg_ctrl --> A_send

  %% Mark read explicitly (опционально, отдельным запросом)
  U_open_dm --> A_mark_read --> API_msg_routes --> API_auth_mw --> API_msg_ctrl --> DB_msg --> API_msg_ctrl --> A_mark_read

  %% Delete message (только свои)
  U_delete --> A_delete --> API_msg_routes --> API_auth_mw --> API_msg_ctrl --> DB_msg --> API_msg_ctrl --> A_delete
```

## Полный список внешних точек (для самопроверки)

REST:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/users/search`
- `GET /api/users/:userId/profile`
- `POST /api/users/:targetUserId/follow`
- `DELETE /api/users/:targetUserId/unfollow`
- `PUT /api/users/profile`
- `GET /api/users/:userId/followers`
- `GET /api/users/:userId/following`
- `POST /api/posts`
- `GET /api/posts/feed`
- `GET /api/posts/user/:userId`
- `DELETE /api/posts/:postId`
- `POST /api/posts/:postId/toggle-like`
- `POST /api/posts/:postId/comments`
- `GET /api/posts/:postId/comments`
- `POST /api/upload` (multipart image)
- `GET /api/messages/chats`
- `GET /api/messages/chat/:otherUserId`
- `GET /api/messages/conversation/:conversationId`
- `POST /api/messages/send`
- `PUT /api/messages/read`
- `DELETE /api/messages/:messageId`
- `GET /api/conversations/test`
- `POST /api/conversations`
- `GET /api/conversations`
- `GET /api/conversations/:conversationId`
- `POST /api/conversations/:conversationId/members`
- `PUT /api/conversations/:conversationId`
- `DELETE /api/conversations/:conversationId/leave`
- `GET /api/friends`
- `GET /api/friends/requests`
- `POST /api/friends/:targetUserId/request`
- `PUT /api/friends/:requestId/accept`
- `PUT /api/friends/:requestId/reject`
- `DELETE /api/friends/:friendshipId`
