import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

describe('complete module registry customer gate',()=>{
  const registry={};
  beforeAll(()=>{
    window.CARD_MODULES=registry;
    window.registerModule=(type,module)=>{registry[type]=module;};
    window._rmCache={};
    for(const file of fs.readdirSync('modules').filter(name=>name.endsWith('.js')).sort()){
      window.eval(fs.readFileSync(path.join('modules',file),'utf8'));
    }
    window.CARD_MODULES=registry;
    window.eval(fs.readFileSync('card-model.js','utf8'));
  });

  it('registers every gallery type exactly once with a renderer',()=>{
    const definitions=window.WarTabCardModel.typeDefinitions;
    expect(definitions).toHaveLength(24);
    expect(new Set(definitions.map(def=>def.type)).size).toBe(definitions.length);
    for(const definition of definitions){
      expect(registry[definition.type],definition.type+' is not registered').toBeTruthy();
      expect(typeof registry[definition.type].render,definition.type+' has no renderer').toBe('function');
      expect(['launcher','metric','canvas','feed','ambient']).toContain(definition.role);
      expect(definition.description).toBeTruthy();
      expect(definition.recommendedSize).toMatch(/^\d × \d$/);
    }
  });

  it('gives every module a configuration path or an intentional display-only contract',()=>{
    const displayOnly=new Set(['link-list']);
    for(const [type,module] of Object.entries(registry)){
      const configurable=Array.isArray(module.settings)||typeof module.editor==='function';
      expect(configurable||displayOnly.has(type),type+' has no configuration contract').toBe(true);
    }
  });
});
