-- ============================================
-- 文明知识库完整数据库初始化脚本
-- 版本：v2.0
-- 更新时间：2025-06-26
-- 说明：包含完整的数据库结构、索引优化和数据修复
-- 注意：不包含初始数据，所有数据通过管理接口录入确保安全性
-- ============================================

-- 开始事务
BEGIN;

-- 显示初始化开始信息
DO $$
BEGIN
    RAISE NOTICE '=== 文明知识库数据库初始化开始 ===';
    RAISE NOTICE '开始时间: %', NOW();
    RAISE NOTICE '脚本版本: v2.0';
END $$;

-- ============================================
-- 第一部分：基础表结构
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    nickname VARCHAR(255),
    avatar_url VARCHAR(255),
    locale VARCHAR(50),
    signin_type VARCHAR(50),
    signin_ip VARCHAR(255),
    signin_provider VARCHAR(50),
    signin_openid VARCHAR(255),
    invite_code VARCHAR(255) NOT NULL default '',
    updated_at timestamptz DEFAULT NOW(),
    invited_by VARCHAR(255) NOT NULL default '',
    is_affiliate BOOLEAN NOT NULL default false,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at timestamptz,
    password_hash VARCHAR(255), -- 用于邮箱注册用户的密码
    UNIQUE (email, signin_provider)
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_no VARCHAR(255) UNIQUE NOT NULL,
    created_at timestamptz,
    user_uuid VARCHAR(255) NOT NULL DEFAULT '',
    user_email VARCHAR(255) NOT NULL DEFAULT '',
    amount INT NOT NULL,
    interval VARCHAR(50),
    expired_at timestamptz,
    status VARCHAR(50) NOT NULL,
    stripe_session_id VARCHAR(255),
    credits INT NOT NULL,
    currency VARCHAR(50),
    sub_id VARCHAR(255),
    sub_interval_count int,
    sub_cycle_anchor int,
    sub_period_end int,
    sub_period_start int,
    sub_times int,
    product_id VARCHAR(255),
    product_name VARCHAR(255),
    valid_months int,
    order_detail TEXT,
    paid_at timestamptz,
    paid_email VARCHAR(255),
    paid_detail TEXT
);

-- API密钥表
CREATE TABLE IF NOT EXISTS apikeys (
    id SERIAL PRIMARY KEY,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(100),
    user_uuid VARCHAR(255) NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active'
);

-- 积分表
CREATE TABLE IF NOT EXISTS credits (
    id SERIAL PRIMARY KEY,
    trans_no VARCHAR(255) UNIQUE NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    user_uuid VARCHAR(255) NOT NULL,
    trans_type VARCHAR(50) NOT NULL,
    credits INT NOT NULL,
    order_no VARCHAR(255),
    expired_at timestamptz
);

-- 文章表
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(255) UNIQUE NOT NULL,
    slug VARCHAR(255),
    title VARCHAR(255),
    description TEXT,
    content TEXT,
    created_at timestamptz,
    updated_at timestamptz,
    status VARCHAR(50),
    cover_url VARCHAR(255),
    author_name VARCHAR(255),
    author_avatar_url VARCHAR(255),
    locale VARCHAR(50)
);

-- 联盟表
create table IF NOT EXISTS affiliates (
    id SERIAL PRIMARY KEY,
    user_uuid VARCHAR(255) NOT NULL,
    created_at timestamptz,
    status VARCHAR(50) NOT NULL default '',
    invited_by VARCHAR(255) NOT NULL,
    paid_order_no VARCHAR(255) NOT NULL default '',
    paid_amount INT NOT NULL default 0,
    reward_percent INT NOT NULL default 0,
    reward_amount INT NOT NULL default 0
);

-- 反馈表
CREATE TABLE IF NOT EXISTS feedbacks (
    id SERIAL PRIMARY KEY,
    created_at timestamptz,
    status VARCHAR(50),
    user_uuid VARCHAR(255),
    content TEXT,
    rating INT
);

-- 邮箱验证码表
CREATE TABLE IF NOT EXISTS email_verifications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'register', 'reset_password', 'change_email'
    created_at timestamptz DEFAULT NOW(),
    expires_at timestamptz NOT NULL,
    verified_at timestamptz,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    is_used BOOLEAN DEFAULT FALSE,
    user_uuid VARCHAR(255)
);

-- ============================================
-- 第二部分：资源管理表结构
-- ============================================

-- 资源分类表
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 资源主表
CREATE TABLE IF NOT EXISTS resources (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    content TEXT,
    file_url VARCHAR(1000),
    category_id INTEGER REFERENCES categories(id),
    author_id VARCHAR(255) REFERENCES users(uuid),
    status VARCHAR(50) DEFAULT 'pending',
    rating_avg DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    access_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_free BOOLEAN DEFAULT TRUE,
    credits INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    color VARCHAR(20),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 资源标签关联表
CREATE TABLE IF NOT EXISTS resource_tags (
    resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (resource_id, tag_id)
);

-- 用户收藏表
CREATE TABLE IF NOT EXISTS user_favorites (
    id SERIAL PRIMARY KEY,
    user_uuid VARCHAR(255) REFERENCES users(uuid),
    resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_uuid, resource_id)
);

-- 资源评分表
CREATE TABLE IF NOT EXISTS resource_ratings (
    id SERIAL PRIMARY KEY,
    user_uuid VARCHAR(255) REFERENCES users(uuid),
    resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_uuid, resource_id)
);

-- 资源评论表
CREATE TABLE IF NOT EXISTS resource_comments (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(255) UNIQUE NOT NULL,
    resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
    user_uuid VARCHAR(255) REFERENCES users(uuid),
    content TEXT NOT NULL,
    parent_id INTEGER REFERENCES resource_comments(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 第三部分：索引优化
-- ============================================

-- 基础表索引
DO $$
BEGIN
    -- users 表索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'users' AND indexname = 'idx_users_email') THEN
        CREATE INDEX idx_users_email ON users(email);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'users' AND indexname = 'idx_users_uuid') THEN
        CREATE INDEX idx_users_uuid ON users(uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'users' AND indexname = 'idx_users_created_at') THEN
        CREATE INDEX idx_users_created_at ON users(created_at);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'users' AND indexname = 'idx_users_signin_provider') THEN
        CREATE INDEX idx_users_signin_provider ON users(signin_provider);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'users' AND indexname = 'idx_users_email_verified') THEN
        CREATE INDEX idx_users_email_verified ON users(email_verified);
    END IF;

    -- orders 表索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'orders' AND indexname = 'idx_orders_user_uuid') THEN
        CREATE INDEX idx_orders_user_uuid ON orders(user_uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'orders' AND indexname = 'idx_orders_user_email') THEN
        CREATE INDEX idx_orders_user_email ON orders(user_email);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'orders' AND indexname = 'idx_orders_status') THEN
        CREATE INDEX idx_orders_status ON orders(status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'orders' AND indexname = 'idx_orders_created_at') THEN
        CREATE INDEX idx_orders_created_at ON orders(created_at);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'orders' AND indexname = 'idx_orders_paid_at') THEN
        CREATE INDEX idx_orders_paid_at ON orders(paid_at);
    END IF;

    -- apikeys 表索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'apikeys' AND indexname = 'idx_apikeys_user_uuid') THEN
        CREATE INDEX idx_apikeys_user_uuid ON apikeys(user_uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'apikeys' AND indexname = 'idx_apikeys_status') THEN
        CREATE INDEX idx_apikeys_status ON apikeys(status);
    END IF;

    -- credits 表索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'credits' AND indexname = 'idx_credits_user_uuid') THEN
        CREATE INDEX idx_credits_user_uuid ON credits(user_uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'credits' AND indexname = 'idx_credits_trans_type') THEN
        CREATE INDEX idx_credits_trans_type ON credits(trans_type);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'credits' AND indexname = 'idx_credits_created_at') THEN
        CREATE INDEX idx_credits_created_at ON credits(created_at);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'credits' AND indexname = 'idx_credits_expired_at') THEN
        CREATE INDEX idx_credits_expired_at ON credits(expired_at);
    END IF;

    -- posts 表索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'posts' AND indexname = 'idx_posts_slug') THEN
        CREATE INDEX idx_posts_slug ON posts(slug);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'posts' AND indexname = 'idx_posts_status') THEN
        CREATE INDEX idx_posts_status ON posts(status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'posts' AND indexname = 'idx_posts_created_at') THEN
        CREATE INDEX idx_posts_created_at ON posts(created_at);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'posts' AND indexname = 'idx_posts_locale') THEN
        CREATE INDEX idx_posts_locale ON posts(locale);
    END IF;

    -- affiliates 表索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'affiliates' AND indexname = 'idx_affiliates_user_uuid') THEN
        CREATE INDEX idx_affiliates_user_uuid ON affiliates(user_uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'affiliates' AND indexname = 'idx_affiliates_invited_by') THEN
        CREATE INDEX idx_affiliates_invited_by ON affiliates(invited_by);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'affiliates' AND indexname = 'idx_affiliates_status') THEN
        CREATE INDEX idx_affiliates_status ON affiliates(status);
    END IF;

    -- feedbacks 表索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'feedbacks' AND indexname = 'idx_feedbacks_user_uuid') THEN
        CREATE INDEX idx_feedbacks_user_uuid ON feedbacks(user_uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'feedbacks' AND indexname = 'idx_feedbacks_status') THEN
        CREATE INDEX idx_feedbacks_status ON feedbacks(status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'feedbacks' AND indexname = 'idx_feedbacks_created_at') THEN
        CREATE INDEX idx_feedbacks_created_at ON feedbacks(created_at);
    END IF;

    -- email_verifications 表索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'email_verifications' AND indexname = 'idx_email_verifications_email_code') THEN
        CREATE INDEX idx_email_verifications_email_code ON email_verifications(email, code);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'email_verifications' AND indexname = 'idx_email_verifications_expires_at') THEN
        CREATE INDEX idx_email_verifications_expires_at ON email_verifications(expires_at);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'email_verifications' AND indexname = 'idx_email_verifications_type') THEN
        CREATE INDEX idx_email_verifications_type ON email_verifications(type);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'email_verifications' AND indexname = 'idx_email_verifications_is_used') THEN
        CREATE INDEX idx_email_verifications_is_used ON email_verifications(is_used);
    END IF;

    RAISE NOTICE '基础表索引创建完成';
END $$;

-- 资源管理表索引
DO $$
BEGIN
    -- categories 表索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'categories' AND indexname = 'idx_categories_parent_id') THEN
        CREATE INDEX idx_categories_parent_id ON categories(parent_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'categories' AND indexname = 'idx_categories_sort_order') THEN
        CREATE INDEX idx_categories_sort_order ON categories(sort_order);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'categories' AND indexname = 'idx_categories_name') THEN
        CREATE INDEX idx_categories_name ON categories(name);
    END IF;

    -- resources 表索引（关键性能优化）
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resources' AND indexname = 'idx_resources_uuid') THEN
        CREATE INDEX idx_resources_uuid ON resources(uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resources' AND indexname = 'idx_resources_category_id') THEN
        CREATE INDEX idx_resources_category_id ON resources(category_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resources' AND indexname = 'idx_resources_author_id') THEN
        CREATE INDEX idx_resources_author_id ON resources(author_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resources' AND indexname = 'idx_resources_status') THEN
        CREATE INDEX idx_resources_status ON resources(status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resources' AND indexname = 'idx_resources_created_at') THEN
        CREATE INDEX idx_resources_created_at ON resources(created_at);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resources' AND indexname = 'idx_resources_rating_avg') THEN
        CREATE INDEX idx_resources_rating_avg ON resources(rating_avg);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resources' AND indexname = 'idx_resources_access_count') THEN
        CREATE INDEX idx_resources_access_count ON resources(access_count);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resources' AND indexname = 'idx_resources_view_count') THEN
        CREATE INDEX idx_resources_view_count ON resources(view_count);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resources' AND indexname = 'idx_resources_is_featured') THEN
        CREATE INDEX idx_resources_is_featured ON resources(is_featured);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resources' AND indexname = 'idx_resources_is_free') THEN
        CREATE INDEX idx_resources_is_free ON resources(is_free);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resources' AND indexname = 'idx_resources_credits') THEN
        CREATE INDEX idx_resources_credits ON resources(credits);
    END IF;

    -- tags 表索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'tags' AND indexname = 'idx_tags_name') THEN
        CREATE INDEX idx_tags_name ON tags(name);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'tags' AND indexname = 'idx_tags_usage_count') THEN
        CREATE INDEX idx_tags_usage_count ON tags(usage_count);
    END IF;

    -- resource_tags 表索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resource_tags' AND indexname = 'idx_resource_tags_resource_id') THEN
        CREATE INDEX idx_resource_tags_resource_id ON resource_tags(resource_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resource_tags' AND indexname = 'idx_resource_tags_tag_id') THEN
        CREATE INDEX idx_resource_tags_tag_id ON resource_tags(tag_id);
    END IF;

    -- user_favorites 表索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'user_favorites' AND indexname = 'idx_user_favorites_user_uuid') THEN
        CREATE INDEX idx_user_favorites_user_uuid ON user_favorites(user_uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'user_favorites' AND indexname = 'idx_user_favorites_resource_id') THEN
        CREATE INDEX idx_user_favorites_resource_id ON user_favorites(resource_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'user_favorites' AND indexname = 'idx_user_favorites_created_at') THEN
        CREATE INDEX idx_user_favorites_created_at ON user_favorites(created_at);
    END IF;

    -- resource_ratings 表索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resource_ratings' AND indexname = 'idx_resource_ratings_user_uuid') THEN
        CREATE INDEX idx_resource_ratings_user_uuid ON resource_ratings(user_uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resource_ratings' AND indexname = 'idx_resource_ratings_resource_id') THEN
        CREATE INDEX idx_resource_ratings_resource_id ON resource_ratings(resource_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resource_ratings' AND indexname = 'idx_resource_ratings_rating') THEN
        CREATE INDEX idx_resource_ratings_rating ON resource_ratings(rating);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resource_ratings' AND indexname = 'idx_resource_ratings_created_at') THEN
        CREATE INDEX idx_resource_ratings_created_at ON resource_ratings(created_at);
    END IF;

    -- resource_comments 表索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resource_comments' AND indexname = 'idx_resource_comments_uuid') THEN
        CREATE INDEX idx_resource_comments_uuid ON resource_comments(uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resource_comments' AND indexname = 'idx_resource_comments_resource_id') THEN
        CREATE INDEX idx_resource_comments_resource_id ON resource_comments(resource_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resource_comments' AND indexname = 'idx_resource_comments_user_uuid') THEN
        CREATE INDEX idx_resource_comments_user_uuid ON resource_comments(user_uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resource_comments' AND indexname = 'idx_resource_comments_parent_id') THEN
        CREATE INDEX idx_resource_comments_parent_id ON resource_comments(parent_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resource_comments' AND indexname = 'idx_resource_comments_status') THEN
        CREATE INDEX idx_resource_comments_status ON resource_comments(status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'resource_comments' AND indexname = 'idx_resource_comments_created_at') THEN
        CREATE INDEX idx_resource_comments_created_at ON resource_comments(created_at);
    END IF;

    RAISE NOTICE '资源管理表索引创建完成';
END $$;

-- ============================================
-- 第四部分：数据库函数
-- ============================================

-- 数据库函数：增加资源浏览量
CREATE OR REPLACE FUNCTION increment_resource_views(resource_uuid VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE resources
    SET view_count = view_count + 1
    WHERE uuid = resource_uuid;
END;
$$ LANGUAGE plpgsql;

-- 数据库函数：增加资源访问量
CREATE OR REPLACE FUNCTION increment_resource_access(resource_uuid VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE resources
    SET access_count = access_count + 1
    WHERE uuid = resource_uuid;
END;
$$ LANGUAGE plpgsql;

-- 数据库函数：增加标签使用次数
CREATE OR REPLACE FUNCTION increment_tag_usage(tag_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE tags
    SET usage_count = usage_count + 1
    WHERE id = tag_id;
END;
$$ LANGUAGE plpgsql;

-- 数据库函数：减少标签使用次数
CREATE OR REPLACE FUNCTION decrement_tag_usage(tag_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE tags
    SET usage_count = GREATEST(usage_count - 1, 0)
    WHERE id = tag_id;
END;
$$ LANGUAGE plpgsql;

-- 触发器函数：自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 resources 表添加 updated_at 触发器
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_resources_updated_at') THEN
        CREATE TRIGGER update_resources_updated_at
            BEFORE UPDATE ON resources
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 为 resource_comments 表添加 updated_at 触发器
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_resource_comments_updated_at') THEN
        CREATE TRIGGER update_resource_comments_updated_at
            BEFORE UPDATE ON resource_comments
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- 第五部分：数据修复（可选）
-- ============================================

-- 字段修复和数据迁移
DO $$
BEGIN
    RAISE NOTICE '开始数据修复和迁移...';

    -- 确保 resources 表字段正确
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resources') THEN
        -- 删除文件类型相关字段（如果存在）
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'file_type') THEN
            ALTER TABLE resources DROP COLUMN file_type;
            RAISE NOTICE '已删除 file_type 字段';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'file_size') THEN
            ALTER TABLE resources DROP COLUMN file_size;
            RAISE NOTICE '已删除 file_size 字段';
        END IF;

        -- 重命名 download_count 为 access_count（如果存在）
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'download_count') THEN
            ALTER TABLE resources RENAME COLUMN download_count TO access_count;
            RAISE NOTICE '已将 download_count 重命名为 access_count';
        END IF;

        -- 修改 price 字段为 credits INTEGER（如果存在）
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'price') THEN
            -- 先添加新的 credits 字段
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'credits') THEN
                ALTER TABLE resources ADD COLUMN credits INTEGER DEFAULT 0;
            END IF;

            -- 将 price 数据迁移到 credits（转换为整数）
            UPDATE resources SET credits = COALESCE(ROUND(price), 0) WHERE price IS NOT NULL;

            -- 删除旧的 price 字段
            ALTER TABLE resources DROP COLUMN price;

            RAISE NOTICE '已将 price 字段转换为 credits INTEGER';
        END IF;

        -- 确保必要字段存在且有默认值
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'access_count') THEN
            ALTER TABLE resources ADD COLUMN access_count INTEGER DEFAULT 0;
            RAISE NOTICE '已添加 access_count 字段';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'credits') THEN
            ALTER TABLE resources ADD COLUMN credits INTEGER DEFAULT 0;
            RAISE NOTICE '已添加 credits 字段';
        END IF;

        -- 清理 NULL 值
        UPDATE resources SET access_count = 0 WHERE access_count IS NULL;
        UPDATE resources SET credits = 0 WHERE credits IS NULL;
        UPDATE resources SET view_count = 0 WHERE view_count IS NULL;
        UPDATE resources SET rating_avg = 0 WHERE rating_avg IS NULL;
        UPDATE resources SET rating_count = 0 WHERE rating_count IS NULL;

        RAISE NOTICE '已清理 resources 表的 NULL 值';
    END IF;

    -- 删除 download_history 表（如果存在）
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'download_history') THEN
        DROP TABLE download_history CASCADE;
        RAISE NOTICE '已删除 download_history 表';
    END IF;

    -- 删除旧的下载相关函数（如果存在）
    DROP FUNCTION IF EXISTS increment_resource_downloads(VARCHAR);

    RAISE NOTICE '数据修复和迁移完成';
END $$;

-- ============================================
-- 第六部分：数据库准备完成
-- ============================================

-- 注意：分类和标签数据将通过管理接口录入，确保数据安全性和一致性

-- ============================================
-- 完成初始化
-- ============================================

-- 显示初始化完成信息
DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    function_count INTEGER;
BEGIN
    -- 统计创建的对象
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public';

    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.prokind = 'f';

    RAISE NOTICE '=== 文明知识库数据库初始化完成 ===';
    RAISE NOTICE '完成时间: %', NOW();
    RAISE NOTICE '创建的表数量: %', table_count;
    RAISE NOTICE '创建的索引数量: %', index_count;
    RAISE NOTICE '创建的函数数量: %', function_count;
    RAISE NOTICE '=== 初始化成功 ===';
    RAISE NOTICE '';
    RAISE NOTICE '数据库结构已准备就绪！';
    RAISE NOTICE '请通过管理后台接口录入分类和标签数据，确保数据安全性。';
END $$;

-- 提交事务
COMMIT;

-- 最终确认
DO $$
BEGIN
    RAISE NOTICE '数据库初始化脚本执行完成！';
    RAISE NOTICE '版本：v2.0';
    RAISE NOTICE '系统：文明知识库';
END $$;