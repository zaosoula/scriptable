// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: cyan; icon-glyph: tasks;
// This script was downloaded using ScriptDude.
// Do not remove these lines, if you want to benefit from automatic updates.
// source: https://raw.githubusercontent.com/zaosoula/scriptable/main/dist/Notion%20Widget.js; docs: https://github.com/zaosoula/scriptable; hash: 000000000;

import NotionApi from './libs/NotionApi';
import { widgetMarkup, concatMarkup } from './libs/WidgetMarkup';
import { getSliceForWidget, generateSlices } from './libs/NoBackground';
const KEYCHAIN_KEY = 'fr.zaosoula.notionwidget';

const getDefaultConfig = () => ({
  notionSecret: '',
  databaseId: '',
  sorts: [],
  filter: {},
  color: 'auto',
  useBackgroundImage: false,
})

const fetchKeychainConfig = () => 
  Keychain.contains(KEYCHAIN_KEY) 
  ? { 
      ...getDefaultConfig(), 
      ...JSON.parse(Keychain.get(KEYCHAIN_KEY))
    } 
  : getDefaultConfig();
let widgetConfig: ReturnType<typeof getDefaultConfig> = fetchKeychainConfig();

(async () => {
  if (config.runsInApp && !args.notification) {
    await showMenu();
  }

  const widget = await buildWidget();
  Script.setWidget(widget);
})();

async function showMenu() {
  await testSettings();

  const alert = new Alert();
  if (args.queryParameters.settings) {
    await showSettings();
  }

  alert.title = Script.name();
  alert.addAction('Preview the widget');
  alert.addAction('Open the settings');
  alert.addAction('Generate widget background');
  alert.addCancelAction('Close');
  const action = await alert.presentSheet();
  switch (action) {
    case 0:
      const widget = await buildWidget();
      widget.presentMedium();
      break;
    case 1:
      await showSettings();
      await showMenu();
      break;
    case 2:
      await generateSlices({ caller: 'self' });
      console.log(await getSliceForWidget(Script.name(), true));
      break;
    default:
      break;
  }
}

async function showSettings() {
  const selectOption = (value, label, selectedValue) => concatMarkup/* xml */`<option value="${value}" ${value == selectedValue ? 'selected' : ''}>${label}</option>`;
  const view = new WebView();
  view.shouldAllowRequest = request => {    
    if(request.url.startsWith("http")) {
      Safari.open(request.url);
      return false;
    }

    return true;
  }
  await view.loadHTML(/* html */`
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/@picocss/pico@latest/css/pico.min.css">
</head>

<body>
  <nav class="container-fluid">
      <ul>
        <li><strong>${Script.name()}</strong></li>
      </ul>
      <ul>
      <li><a href="https://github.com/zaosoula/scriptable">Docs</a></li>
      </ul>
    </nav>
    <hr />
  <main class="container">
    <details>
      <summary>Notion settings</summary>
      
      <label for="notionSecret">Notion Integration Secret</label>
      <input type="text" id="notionSecret" name="notionSecret" placeholder="secret_XXXXXXX" value="${widgetConfig.notionSecret}" required>
      <small><a href="https://developers.notion.com/docs/create-a-notion-integration#step-1-create-an-integration">Create an integration</a></small>
      
      <label for="databaseId">Database ID</label>
      <input type="text" id="databaseId" name="databaseId" placeholder="XXXXXXXXXX" value="${widgetConfig.databaseId}" required>
      <small><a href="https://developers.notion.com/docs/create-a-notion-integration#step-2-share-a-database-with-your-integration">Share a database with your integration</a></small>

      <label for="sorts">Sorts</label>
      <textarea id="sorts" name="sorts" placeholder="[]" required>${JSON.stringify(widgetConfig.sorts, null, 2)}</textarea>
      <small><a href="https://developers.notion.com/reference/post-database-query-sort">Sort object</a></small>

      <label for="filter">Filter</label>
      <textarea id="filter" name="filter" placeholder="{}" required>${JSON.stringify(widgetConfig.filter, null, 2)}</textarea>
      <small><a href="https://developers.notion.com/reference/post-database-query-filter">Filter object</a></small>

    </details>

    <details>
      <summary>Appearance</summary>
      
      <fieldset>
        <label for="useBackgroundImage">
          <input type="checkbox" id="useBackgroundImage" name="useBackgroundImage" role="switch" ${widgetConfig.useBackgroundImage ? 'checked' : ''}/>
          Use background image 
        </label>
        <small>
          You can generate the background image from the main menu
        </small>
      </fieldset>

      <label for="color">Text color</label>
      <select id="color" name="color" required>
        ${selectOption('auto', 'System', widgetConfig.color)}
        ${selectOption('black', 'Dark', widgetConfig.color)}
        ${selectOption('white', 'Light', widgetConfig.color)}
      </select>
    </details>
  </main>

  <script>
    const parseJson = (val, fallback) => { try { return JSON.parse(val); } catch { return fallback; } };

    window.getSettings = () => ({
      ...Object.fromEntries(Array.from(document.querySelectorAll('input[name], textarea[name], select[name]')).map(input => [input.name, input.value])),
      useBackgroundImage: document.querySelector("[name=useBackgroundImage]").checked,
      sorts: parseJson(document.querySelector("[name=sorts]").value, []),
      filter: parseJson(document.querySelector("[name=filter]").value, []),
    })
  </script>
</body>
</html>
`);

  await view.present();

  const payload = await view.evaluateJavaScript('window.getSettings()');

  widgetConfig = { ...widgetConfig, ...payload };
  console.log(widgetConfig);

  await testSettings();
}

async function testSettings() {
  try {
    await fetchNotion();
    Keychain.set(KEYCHAIN_KEY, JSON.stringify(widgetConfig));
  } catch (error) {
    const alert = new Alert();
    alert.title = 'Failed to fetch data from notion';
    alert.message = `It seems that the settings provided are not valid.\nNotion answered with an error:\n${error.message}`;

    alert.addAction('Edit settings');
    alert.addCancelAction('Keep previous settings');
    alert.addDestructiveAction('Save anyway');
    const action = await alert.presentSheet();

    switch (action) {
      case -1:
        widgetConfig = fetchKeychainConfig();
        return;
      case 0:
        await showSettings();
        break;
      case 1:
        Keychain.set(KEYCHAIN_KEY, JSON.stringify(widgetConfig));
        break;
      default:
        break;
    }
    return;
  }
}

async function fetchNotion() {
  const notion = new NotionApi(widgetConfig.notionSecret);

  const database = await notion.getDatabase(widgetConfig.databaseId);
  const query = await notion.queryDatabase(widgetConfig.databaseId, {
    filter: widgetConfig.filter,
    sorts: widgetConfig.sorts,
  });

  if (database.object === 'error' || query.object === 'error') {
    console.warn(database.message || query.message);
    throw new Error(database.message || query.message);
  }
  return { database, query };
};

// eslint-disable-next-line consistent-return
async function buildWidget() {
  try {
    const { database, query } = await fetchNotion();

    const tasks = query.results.map((task) => ({
      url: `notion://www.notion.so/${widgetConfig.databaseId}`,
      name: task.properties.Name.title[0].plain_text,
      date: task.properties.Deadline?.date?.start,
    }));

    const notionDeepLink = `notion://www.notion.so/${widgetConfig.databaseId}`;
    let themeColor = Color.dynamic(Color.black(), Color.white());
    if (widgetConfig.color !== 'auto') themeColor = Color[widgetConfig.color]();
    
    let backgroundImage = null;
    if (widgetConfig.useBackgroundImage) {
      backgroundImage = await getSliceForWidget(Script.name());
    }

    const styles = {
      widget: {
        backgroundImage,
      },
      header: {
        stack: {
          url: notionDeepLink,
        },
        image: {
          imageSize: new Size(20, 20),
          tintColor: themeColor,
        },
        text: {
          textColor: themeColor,
          font: Font.boldSystemFont(15),
        },
        btnRefresh: {
          url: 'shortcuts://run-shortcut?name=Refresh%20All%20Widgets',
          imageSize: new Size(20, 20),
          tintColor: themeColor,
        },
        btnSettings: {
          url: URLScheme.forRunningScript() + '?settings=true',
          imageSize: new Size(20, 20),
          tintColor: themeColor,
        },
      },
      task: {
        stack: {
          url: notionDeepLink,
        },
        image: {
          imageSize: new Size(15, 15),
          tintColor: themeColor,
          imageOpacity: 0.75,
          url: notionDeepLink,
        },
        text: {
          textColor: themeColor,
          font: Font.mediumSystemFont(15),
        },
        date: {
          textColor: themeColor,
          font: Font.regularSystemFont(15),
          textOpacity: 0.75,
        },
      },
    };

    const tasksToDisplay = Math.min(tasks.length, 4);


    const widget = await widgetMarkup/* xml */`
<widget styles="${styles.widget}">
  <spacer value="16" />
  <hstack styles="${styles.header.stack}">
    <image styles="${styles.header.image}" src="${SFSymbol.named('checklist').image}" />
    <spacer value="6" />
    <text styles="${styles.header.text}">${database.title[0].plain_text}</text>
    <spacer />
    <image styles="${styles.header.btnSettings}" src="${SFSymbol.named('gear').image}" />
    <spacer value="6" />
    <image styles="${styles.header.btnRefresh}" src="${SFSymbol.named('arrow.clockwise.circle').image}" />
  </hstack>
  <spacer value="10" />
  <vstack>
    ${tasks.slice(0, tasksToDisplay).map(
      (task) => concatMarkup/* xml */`
        <hstack styles="${styles.task.stack}">
         <image styles="${styles.task.image}" src="${SFSymbol.named('circle').image}" />
         <spacer value="6" />
         <text styles="${styles.task.text}">${task.name}</text>
         ${task.date
          ? concatMarkup/* xml */`
            <text styles="${styles.task.date}"> — ${new RelativeDateTimeFormatter().string(new Date(task.date), new Date())}</text>
          `
          : ''
        }
        </hstack>
        <spacer value="8" />
      `,
    )}
    ${tasks.length > tasksToDisplay ? concatMarkup/* xml */`
    <hstack>
      <image styles="${styles.task.image}" src="${SFSymbol.named('plus.circle').image}" />
      <spacer value="6" />
      <text styles="${styles.task.text}">${(tasks.length - tasksToDisplay).toString()} more</text>
    </hstack>
    <spacer value="8" />
    ` : ''}
    <spacer />
  </vstack>
</widget>
`;

    return widget;
  } catch (error) {
    console.warn('[buildWidget]');
    console.error(error);
    throw error;
  }
}
