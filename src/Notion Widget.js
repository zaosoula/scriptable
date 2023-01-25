// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: cyan; icon-glyph: tasks;
const NotionApi = require('./libs/NotionApi');
const { widgetMarkup, concatMarkup } = require('./libs/WidgetMarkup');

const KEYCHAIN_KEY = 'fr.zaosoula.notionwidget';
let widgetConfig = Keychain.contains(KEYCHAIN_KEY) ? JSON.parse(Keychain.get(KEYCHAIN_KEY)) : {
  notionSecret: '',
  databaseId: '',
  sorts: [],
  filter: {},
};

(async () => {
  if (config.runsInApp && !args.notification) {
    await showSettings();
  }

  const widget = await buildWidget();
  Script.setWidget(widget);

  if (args.notification) {
    widget.presentMedium();
  }

  Script.complete();
})();

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
  Keychain.set(KEYCHAIN_KEY, JSON.stringify(widgetConfig));

  const notification = new Notification();
  notification.title = Script.name();
  notification.subtitle = 'Your settings have been saved';
  notification.body = 'Tap to preview your widget';
  notification.openURL = URLScheme.forRunningScript();
  notification.schedule();
}

// eslint-disable-next-line consistent-return
async function buildWidget() {
  try {
    const notion = new NotionApi(widgetConfig.notionSecret);

    const database = await notion.getDatabase(widgetConfig.databaseId);
    const query = await notion.queryDatabase(widgetConfig.databaseId, {
      filter: widgetConfig.filter,
      sorts: widgetConfig.sorts,
    });

    const tasks = query.results.map((task) => ({
      url: `notion://www.notion.so/${widgetConfig.databaseId}`,
      name: task.properties.Name.title[0].plain_text,
      date: task.properties.Deadline?.date?.start,
    }));

    const notionDeepLink = `notion://www.notion.so/${widgetConfig.databaseId}`;
    const styles = {
      header: {
        stack: {
          url: notionDeepLink,
        },
        image: {
          imageSize: new Size(17, 17),
          tintColor: Color.white(),
        },
        text: {
          textColor: Color.white(),
          font: Font.boldSystemFont(15),
        },
      },
      task: {
        image: {
          imageSize: new Size(16, 16),
          tintColor: Color.white(),
          imageOpacity: 0.75,
          url: notionDeepLink,
        },
        text: {
          textColor: Color.white(),
          font: Font.mediumSystemFont(15),
          url: notionDeepLink,
        },
      },
      footer: {
        stack: {
          url: 'shortcuts://run-shortcut?name=Refresh%20All%20Widgets',
        },
        image: {
          imageSize: new Size(15, 15),
          tintColor: Color.white(),
        },
      },
    };

    const widget = await widgetMarkup/* xml */`
<widget>
  <hstack styles="${styles.header.stack}">
    <image styles="${styles.header.image}" src="${SFSymbol.named('checklist').image}" />
    <spacer value="6" />
    <text styles="${styles.header.text}">${database.title[0].plain_text}</text>
    <spacer />
  </hstack>
  <spacer value="16" />
  <vstack>
    ${tasks.map(
      (task) => concatMarkup/* xml */`
        <hstack>
         <image styles="${styles.task.image}" src="${SFSymbol.named('circle').image}" />
         <spacer value="6" />
         <text styles="${styles.task.text}">${task.name}</text>
        </hstack>
        <spacer value="8" />
      `,
    )}
    <spacer />
  </vstack>
  <hstack styles="${styles.footer.stack}">
    <spacer />
    <image styles="${styles.footer.image}" src="${SFSymbol.named('arrow.clockwise.circle').image}" />
  </hstack>
</widget>
`;

    return widget;
  } catch (error) {
    console.warn('[buildWidget]');
    console.error(error);
    Script.complete();
  }
}
