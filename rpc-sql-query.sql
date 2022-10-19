-- 블록 정보
SELECT * 
FROM btc_wallet_dev.block_info 
ORDER BY id DESC;

-- 한시간 동안, 트랜잭션 개수, 7000 개 정도
-- 초당 2개 이상 트랜잭션 처리 하면 블록생성 속도 만큼 쫓아갈 수 있음
SELECT SUM(tx_cnt)
FROM btc_wallet_dev.block_info 
WHERE time > 1665721994 - 3600
AND time < 1665721994
ORDER BY id DESC;

-- 블록 정보(시간 포맷)
SELECT 
	id, block_no, tx_cnt, 
    FROM_UNIXTIME(time) AS `utc_time`, -- 해당 블록 생성 시간
    CONVERT_TZ(FROM_UNIXTIME(time), '+00:00', '+09:00') AS `kor_time`, -- 데이터 생성 시간
    CONVERT_TZ(FROM_UNIXTIME(created_at), '+00:00', '+09:00') AS created_at -- 데이터 생성 시간
FROM btc_wallet_dev.block_info 
-- tx 가 3000개 이상
-- WHERE tx_cnt > 3000
ORDER BY id DESC;

-- 특정 블록에 해당하는 트랜잭션 리스트
SELECT * FROM btc_wallet_dev.block_tx
WHERE block_no=758595
ORDER BY id DESC
;

-- 트랜잭션 리스트
SELECT * 
FROM btc_wallet_dev.block_tx
ORDER BY id DESC
;

-- 특정 블록 트랜잭션 개수
SELECT count(*) 
FROM btc_wallet_dev.block_tx
WHERE block_no=758234
;

-- 업데이트 된 트랜잭션 개수
SELECT COUNT(*)
FROM btc_wallet_dev.block_tx
-- WHERE updated_at IS NOT NULL
WHERE updated_at IS NULL
ORDER BY id DESC
;

-- 트랜잭션 상세조회 처리 안된 가장 과거 row 조회
SELECT * FROM btc_wallet_dev.block_tx
WHERE updated_at IS NULL
ORDER BY id ASC
LIMIT 1
;

SELECT *
FROM btc_wallet_dev.block_tx
WHERE id = 257275
;


-- 지갑 테스트 정보 저장
SELECT ROUND(UNIX_TIMESTAMP(CURTIME(4)) * 1000);
SELECT ROUND(UNIX_TIMESTAMP()), ROUND(UNIX_TIMESTAMP(CURTIME(4)));
SELECT UNIX_TIMESTAMP();

INSERT INTO btc_wallet_dev.wallet_info (`name`, label, `desc`, created_at) VALUES('test30', 'label1', '테스트', UNIX_TIMESTAMP());
INSERT INTO btc_wallet_dev.wallet_info (`name`, `desc`, created_at) VALUES('test30', '테스트', UNIX_TIMESTAMP());
INSERT INTO btc_wallet_dev.wallet_info (`name`, label, `desc`, created_at) VALUES('test30', 'label3', '테스트', UNIX_TIMESTAMP());


-- 테스트 주소 저장
INSERT INTO btc_wallet_dev.wallet_address 
(wallet_id, address, created_at, updated_at) 
VALUES (1, '3Lwck9afyZvHyU3VVdPfKD4YuDY7YeGhrv', UNIX_TIMESTAMP(), UNIX_TIMESTAMP());

INSERT INTO btc_wallet_dev.wallet_address 
(wallet_id, address, created_at, updated_at) 
VALUES (2, 'bc1qh3fq42rnl7vvvkrdl7wd6530u3sfp302njw92c', UNIX_TIMESTAMP(), UNIX_TIMESTAMP());

INSERT INTO btc_wallet_dev.wallet_address 
(wallet_id, address, created_at, updated_at) 
VALUES (3, '1AXPfuEGf7boD21WAKvyR1d81mc3EEZKSv', UNIX_TIMESTAMP(), UNIX_TIMESTAMP());

SELECT 
	wi.name,
	wi.label,
	wa.address 
FROM btc_wallet_dev.wallet_address wa
INNER JOIN btc_wallet_dev.wallet_info wi
ON wa.wallet_id = wi.id