import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedURL, nextState, validID} from './policy.mjs';
const origins = new Set(['http://fixture', 'https://example.com']);
test('allows configured origins and paths',()=>assert.equal(allowedURL('https://example.com/a?x=1',origins),true));
test('blocks origin tricks, credentials, ports and local targets',()=>{
 for(const u of ['https://example.com.evil.test/','http://127.0.0.1/','http://169.254.169.254/','file:///etc/passwd','javascript:alert(1)','https://user:pass@example.com','https://example.com:444','bad']) assert.equal(allowedURL(u,origins),false,u);
});
test('limits retry attempts',()=>{assert.equal(nextState(1),'queued');assert.equal(nextState(3),'failed');assert.equal(nextState(4),'failed')});
test('validates result identifiers',()=>{assert.equal(validID('a'.repeat(32)),true);assert.equal(validID('../x'),false)});
