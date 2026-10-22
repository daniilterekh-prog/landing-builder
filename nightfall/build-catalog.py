"""Build a standalone catalogue from real per-source desktop/mobile captures."""
from pathlib import Path
from PIL import Image, ImageStat
import json,re,html,collections,datetime

ROOT=Path(__file__).resolve().parent
REFS=json.loads((ROOT.parent/'research/nightfall/2026-10-22-uae-landings/references.json').read_text())
OVERRIDES=json.loads((ROOT/'classification.json').read_text()) if (ROOT/'classification.json').exists() else {}
FAMILIES=[
 ('header','Хедер и меню','Логотип, навигация, язык и способы связи.'),
 ('hero','Hero · первый экран','Крупное фото или видео, заголовок, предложение и главное действие.'),
 ('facts','Ключевые параметры','Цифры проекта, типы жилья, срок сдачи и другие характеристики.'),
 ('about','О проекте и концепция','Первое знакомство с проектом и его образом жизни.'),
 ('benefits','Преимущества','Аргументы выбора и особенности проекта.'),
 ('architecture','Архитектура и дизайн','Автор проекта, экстерьер, архитектура и брендовые коллаборации.'),
 ('interiors','Интерьеры и отделка','Материалы, мебель и внутренние пространства.'),
 ('gallery','Галереи и видео','Крупные фотографии, слайдеры, визуальные коллекции и ролики.'),
 ('location','Локация и карта','Район, карта, расстояния и ближайшие места.'),
 ('masterplan','Генплан','Общая схема территории и расположение корпусов.'),
 ('amenities','Инфраструктура и wellness','Удобства, общественные пространства, сервисы и wellness.'),
 ('floorplans','Квартиры и планировки','Типы резиденций, планировки, площади и выбор лота.'),
 ('payment','Оплата и условия покупки','Планы оплаты, ипотека и этапы приобретения.'),
 ('investment','Инвестиции и резидентство','Инвестиционная подача, ROI, аргументы о рынке и Golden Visa.'),
 ('brochure','Брошюра и промежуточный CTA','Получение материалов, планировок и переход к консультации.'),
 ('construction','Ход строительства','Фото, видео, проценты готовности и этапы работ.'),
 ('testimonials','Отзывы и доверие','Отзывы клиентов, достижения агентства и подтверждения опыта.'),
 ('developer','Застройщик и бренд','История, достижения, портфолио и доверие к девелоперу.'),
 ('projects','Другие проекты и подборки','Новые запуски, сравнение, похожие комплексы и районы.'),
 ('quiz','Квиз и подбор','Подбор недвижимости под цель, бюджет и предпочтения.'),
 ('faq','Частые вопросы','Вопросы по проекту, условиям и покупке.'),
 ('contact','Контакты и финальная заявка','Обращение к специалисту, регистрация интереса и контакты.'),
 ('footer','Футер','Контакты, навигация и юридическая информация.'),
 ('other','Другие блоки','Дополнительные секции, которые требуют отдельного разбора.')
]
def classify(x,source):
 t=(' '.join([x.get('title',''),x.get('elementId',''),x.get('cls',''),x.get('text','')[:120] if not x.get('title') else ''])).lower()
 first=x.get('title','').lower();tag=x.get('tag','')
 if tag=='FOOTER' or re.search(r'footer|colophon',t):return 'footer'
 if (tag=='HEADER' or re.search(r'navbar|site-header|header-section|^header|\bheader\b',t)) and x['height']<300:return 'header'
 if source==26:return 'quiz'
 if x.get('viewportOnly') or (x['y']<500 and x['height']>350) or re.search(r'hero|welcome|header-banner|bannerslider|section_header_project|section_header7|section_hero-image|section-welcome',t):return 'hero'
 rules=[('faq',r'faq|frequently|questions|вопрос'),('brochure',r'brochure|брошюр|download.*plan|view all floor|получить.*презентац|project-banner'),('construction',r'construction|progress|строитель|готовност'),('masterplan',r'master.?plan|генплан'),('payment',r'payment|mortgage|оплат|рассроч|financing|process.*step|простой процесс'),('floorplans',r'floor.?plan|unit.type|\blayout\b|apparts|планиров|апартамент|property_section|residences at palm central'),('interiors',r'interior|finishing|furnished|отделк|интерьер|int-ext'),('architecture',r'architect|exterior|catwalk|curve|дизайн|архитектур'),('location',r'location|getting here|maparea|\barea\b|attraction|central location|располож|локаци|окружен'),('amenities',r'amenit|wellness|well.living|vitality|clubhouse|leisure|well.being|инфраструктур|комфорт в|services|в здании'),('investment',r'invest|golden visa|visa|\broi\b|резидент|инвестиц|что вы получаете'),('developer',r'why.*(binghatti|damac|ellington|aldar)|about.*(select|taraf|nakheel|developer)|developer.info|застройщик|девелопер'),('projects',r'projects|launches|collections|communities|developments|nearby|similar|branded.collection|другие проект|международные|проекты на этапе'),('quiz',r'quiz|what are you looking|подбор|choose.*home'),('gallery',r'gallery|visual.collection|video|media|image.parallax|slider|галере|photo|визуал'),('contact',r'contact|register|enquir|sales.team|sales.represent|form.section|subscribe|свяж|заявк|контакт|интерес'),('facts',r'figures|parameters|milestone|facts|summary|цифр|параметр'),('benefits',r'key.features|highlights|features|benefits|преимуществ'),('about',r'about|overview|introduction|concept|project.section|projectlayout|the project|curated|lifestyle|community|о проект|концепц')]
 for f,pat in rules:
  if re.search(pat,t):return f
 text=x.get('text','').lower()
 if re.search(r'privacy|copyright|all rights reserved|политик.*конфиденц',text) and x['height']<500:return 'footer'
 if not text and x['height']>250:return 'gallery'
 if re.search(r'register your interest|send request|оставьте|получить детали',text[:150]):return 'contact'
 return 'about' if len(text)>100 else 'other'

def state(block):
 s=dict(block.get('state',{}));raw=s.pop('rawFile',None)
 if s.get('status')!='ok' or not raw:return {**s,'parts':[]}
 fp=ROOT/raw
 if not fp.exists():return {'status':'error','note':'Файл исходного снимка отсутствует.','parts':[]}
 with Image.open(fp) as im:
  w,h=im.size;s.update(captureWidth=w,captureHeight=h);parts=[]
  # A blank capture is explicitly unavailable rather than presented as a valid reference.
  test=im.resize((80,80)).convert('RGB');px=list(test.getdata());white=sum(min(p)>244 for p in px)/len(px)
  if h>350 and white>.97:
   return {**s,'status':'error','note':'Визуальное содержимое не отобразилось при захвате. Открой источник: возможен видеокодек или анимация.','parts':[],'blankRatio':round(white,3)}
  if h<=2600:parts=[{'file':raw,'width':w,'height':h}]
  else:
   for i,y in enumerate(range(0,h,2400),1):
    rel='shots/'+fp.stem+f'-part{i:02}.jpg';crop=im.crop((0,y,w,min(y+2400,h)));crop.save(ROOT/rel,quality=79,optimize=True);parts.append({'file':rel,'width':w,'height':crop.height})
  thumb=im.crop((0,0,w,min(h,round(w*.74))));thumb.thumbnail((640,640));rel='thumbs/'+fp.name;thumb.convert('RGB').save(ROOT/rel,quality=75,optimize=True)
  s['parts']=parts;s['thumbnail']=rel
 return s

variants=[];projects=[];coverage=[]
for ref in REFS:
 pid=ref['id'].lower();n=int(ref['id'][4:]);projects.append({'id':pid,'name':ref['name'],'domain':ref['url'].split('/')[2],'kind':'project'})
 current=[];report={'id':ref['id'],'name':ref['name'],'url':ref['url'],'ad':ref['ad'],'owner':ref['owner'],'modes':{}}
 for mode in ['desktop','mobile']:
  file=ROOT/'captures'/f'{ref["id"]}-{mode}.json'
  if not file.exists():report['modes'][mode]={'status':'pending','blocks':0};continue
  doc=json.loads(file.read_text());report['modes'][mode]={'status':'error' if doc.get('error') else 'ok','error':doc.get('error'),'blocks':len(doc['blocks']),'capturedAt':doc.get('capturedAt'),'url':doc.get('url')};used=set()
  blocks=doc['blocks']
  blocks=[x for x in blocks if not (x.get('tag')=='HEADER' and x.get('y',0)>300 and x.get('height',0)<250 and any(y is not x and y.get('height',0)>x['height']*2 and abs(y.get('y',0)-x['y'])<180 for y in blocks))]
  for i,b in enumerate(blocks,1):
   f=OVERRIDES.get(ref['id'],{}).get(b['selector']) or classify(b,n);title=b.get('title','').strip();norm=lambda t:re.sub(r'\W','',t.lower())
   # Match the same DOM region, then its semantic title, then its ordinal within a family.
   match=next((v for v in current if v['id']not in used and v['selector']==b['selector']),None)
   if not match and title:match=next((v for v in current if v['id']not in used and v['family']==f and norm(v.get('originalTitle',''))==norm(title)),None)
   if not match and mode=='mobile':match=next((v for v in current if v['id']not in used and v['family']==f and v['states']['mobile']['status']=='hidden'),None)
   if not match:
    match={'id':pid+'-b'+str(len(current)+1).zfill(2),'family':f,'project':pid,'projectName':ref['name'],'sourceKind':'original','name':title[:100] or dict((a,b)for a,b,_ in FAMILIES)[f]+' · '+str(i),'originalTitle':title,'selector':b['selector'],'order':i,'domain':ref['url'].split('/')[2],'sourceUrl':ref['url'],'source':'website','ad':ref['ad'],'ownerType':'developer' if n<=19 else 'agency','h1Words':b.get('h1Words',0),'priority':([1,2,20,21,3,10,13,22,18,26].index(n) if n in [1,2,20,21,3,10,13,22,18,26] else 20),'states':{'desktop':{'status':'hidden','parts':[],'note':'На этой ширине отдельная секция не обнаружена.'},'mobile':{'status':'hidden','parts':[],'note':'На этой ширине отдельная секция не обнаружена.'}}}
    current.append(match)
   match['states'][mode]=state(b);used.add(match['id'])
  if doc.get('error'):
   for v in current:v['states'][mode]={'status':'error','parts':[],'note':'Источник не открылся: '+doc['error'][:130]}
 current=[v for v in current if any(s.get('status')!='hidden' for s in v['states'].values())]
 if not current:
  current=[{'id':pid+'-unavailable','family':'hero','project':pid,'projectName':ref['name'],'sourceKind':'original','name':'Источник ожидает захвата','sourceUrl':ref['url'],'source':'website','ad':ref['ad'],'ownerType':'developer' if n<=19 else 'agency','states':{m:{'status':'pending','parts':[],'note':'Источник ещё обрабатывается.'}for m in ['desktop','mobile']}}]
 if n==26 and current and current[0]['states']['desktop'].get('status')=='ok':
  clone={**current[0],'id':pid+'-hero','family':'hero','name':'Первый экран с квизом подбора','dualPurpose':True};current.append(clone)
 for mode in ['desktop','mobile']:
  report['modes'][mode]['successful']=sum(v['states'][mode].get('status')=='ok' for v in current)
 report['variants']=len(current);coverage.append(report);variants.extend(current)

families=[{'id':a,'name':b,'description':c,'hint':'Сравни композицию, объём текста и мобильную версию. Отметь основу и запиши, что берём для Nightfall.','count':sum(v['family']==a for v in variants)}for a,b,c in FAMILIES]
data={'version':1,'libraryId':'nightfall-uae-v1','preparedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceCommit':'live-2026-10-22','projects':projects,'families':families,'variants':variants}
(ROOT/'catalog.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
(ROOT/'catalog-data.js').write_text('window.BLOCK_LIBRARY='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
(ROOT/'coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2))
lines=['<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Nightfall · 30 источников</title><link rel="stylesheet" href="library.css"><style>main{max-width:1300px;margin:auto;padding:36px 20px}table{border-collapse:collapse;width:100%;font-size:13px}td,th{text-align:left;padding:14px;border-bottom:1px solid var(--line)}.table-scroll{overflow:auto}small{display:block;color:var(--muted)}h1{font-family:Tenor;font-weight:400}</style></head><body><main><a href="./">← Библиотека Nightfall</a><h1>30 источников ОАЭ</h1><p>Снимки на ширинах 1440 и 390 px. Статусы отражают захват, а не качество сайта. Формы не отправлялись.</p><div class="table-scroll"><table><thead><tr><th>Источник</th><th>Тип</th><th>Блоков</th><th>Десктоп</th><th>Телефон</th></tr></thead><tbody>']
for r in coverage:
 vals=[]
 for m in ['desktop','mobile']:
  z=r['modes'][m];vals.append(str(z['successful'])+' снимков' if z['status']=='ok' else ('Готовится' if z['status']=='pending' else 'Ошибка источника'))
 lines.append(f'<tr><td><a href="{html.escape(r["url"])}" target="_blank" rel="noopener">{html.escape(r["name"])}</a><small>{html.escape(r["owner"])}</small></td><td>{"Реклама Google" if r["ad"] else "Обычная выдача"}</td><td><a href="./?type=hero&project={r["id"].lower()}">{r["variants"]}</a></td><td>{vals[0]}</td><td>{vals[1]}</td></tr>')
lines+=['</tbody></table></div><p><a href="coverage.json">Опись захвата JSON</a> · <a href="../research/nightfall/2026-10-22-uae-landings/README.md">Исследование и запросы Google</a></p></main></body></html>']
(ROOT/'sources.html').write_text('\n'.join(lines))
print(len(variants),'variants;',sum(s['status']=='ok'for v in variants for s in v['states'].values()),'available states; families:',{f['id']:f['count']for f in families if f['count']})
