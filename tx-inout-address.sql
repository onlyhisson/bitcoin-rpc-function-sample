-- #################################################################
-- 트랜잭션
-- 74a5e76e8c3852d0a19e94fab0fff66da660a32173add1c7f6510e19e066b60b
-- #################################################################

SELECT * 
FROM btc_wallet_dev.block_tx
WHERE txid = '74a5e76e8c3852d0a19e94fab0fff66da660a32173add1c7f6510e19e066b60b'
ORDER BY id DESC
;
-- 250503

SELECT * 
FROM btc_wallet_dev.tx_input
WHERE txid_id = 250503
;

-- 이전 트랜잭션
-- 0 index
-- 03c885365d0eaab5dba83517d367b33e16ee1d3f1de984f7bbc11013b9f2f0c7

SELECT * 
FROM btc_wallet_dev.tx_output
WHERE txid_id = 250503
;
-- 현재 트랜잭션 utxo
-- 0 0.01026614 bc1qkmavamv602vcjdy5qmamcxtvgpeqc8lg7sle0w
-- 1 0.00005156 bc1qt0zc7s8aut3wfle26av65jnm0zefz6xrumzn3u
-- 2 0.00095126 bc1qn4lzedf66zz4ff97q0rjg3ztp8hzf9egnqp828

-- 이전 트랜색션 id 조회
SELECT * 
FROM btc_wallet_dev.block_tx
WHERE txid = '03c885365d0eaab5dba83517d367b33e16ee1d3f1de984f7bbc11013b9f2f0c7'
ORDER BY id DESC
;
-- 250186

SELECT * 
FROM btc_wallet_dev.tx_output
WHERE txid_id = 250186
AND vout_no = 0
;