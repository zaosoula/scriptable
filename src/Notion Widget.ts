// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: cyan; icon-glyph: tasks;
import NotionApi from './libs/NotionApi';
import { widgetMarkup, concatMarkup } from './libs/WidgetMarkup';

const KEYCHAIN_KEY = 'fr.zaosoula.notionwidget';

const fetchKeychainConfig = () => Keychain.contains(KEYCHAIN_KEY) ? JSON.parse(Keychain.get(KEYCHAIN_KEY)) : {
  notionSecret: '',
  databaseId: '',
  sorts: [],
  filter: {},
};
let widgetConfig = fetchKeychainConfig();

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
    if(args.queryParameters.settings) {
      await showSettings();
    }

    alert.title = Script.name();
    alert.addAction('Preview the widget');
    alert.addAction('Open the settings');
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
      default:
        break;
    }
}

async function showSettings() {
  const view = new WebView();
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
  <main class="container">
    <h1>${Script.name()}</h1>
    <label for="notionSecret">Notion Integration Secret</label>
    <input type="text" id="notionSecret" name="notionSecret" placeholder="secret_XXXXXXX" value="${widgetConfig.notionSecret}" required>
    
    <label for="databaseId">Database ID</label>
    <input type="text" id="databaseId" name="databaseId" placeholder="XXXXXXXXXX" value="${widgetConfig.databaseId}" required>

    <label for="sorts">Sorts</label>
    <textarea id="sorts" name="sorts" placeholder="[]" required>${JSON.stringify(widgetConfig.sorts, null, 2)}</textarea>

    <label for="filter">Filter</label>
    <textarea id="filter" name="filter" placeholder="{}" required>${JSON.stringify(widgetConfig.filter, null, 2)}</textarea>
  </main>

  <script>
    const parseJson = (val, fallback) => { try { return JSON.parse(val); } catch { return fallback; } };

    window.getSettings = () => ({
      ...Object.fromEntries(Array.from(document.querySelectorAll('input[name], textarea[name], select[name]')).map(input => [input.name, input.value])),
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

    if(database.object === 'error' || query.object === 'error') {
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
    const dynamicColor = Color.dynamic(Color.black(), Color.white())
    const styles = {
      header: {
        stack: {
          url: notionDeepLink,
        },
        image: {
          imageSize: new Size(20, 20),
          tintColor: dynamicColor,
        },
        text: {
          textColor: dynamicColor,
          font: Font.boldSystemFont(15),
        },
        btnRefresh: {
          url: 'shortcuts://run-shortcut?name=Refresh%20All%20Widgets',
          imageSize: new Size(20, 20),
          tintColor: dynamicColor,
        },
        btnSettings: {
          url: URLScheme.forRunningScript() + '?settings=true',
          imageSize: new Size(20, 20),
          tintColor: dynamicColor,
        },
      },
      task: {
        stack: {
          url: notionDeepLink,
        },
        image: {
          imageSize: new Size(15, 15),
          tintColor: dynamicColor,
          imageOpacity: 0.75,
          url: notionDeepLink,
        },
        text: {
          textColor: dynamicColor,
          font: Font.mediumSystemFont(15),
        },
        date: {
          textColor: dynamicColor,
          font: Font.regularSystemFont(15),
          textOpacity: 0.75,
        },
      },
    };

    const tasksToDisplay = Math.min(tasks.length, 4);
    

    const widget = await widgetMarkup/* xml */`
<widget>
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
         ${
          task.date
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
