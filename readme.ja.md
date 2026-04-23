# RenderedHTMLDiff_Electron

[English](./readme.md) | 日本語

Electronで動く、HTMLファイル同士の差分可視化ツールです。  
HTMLファイルを2つ選択し、レンダリングされたテキストの差分を色付きで可視化します。

## 特徴

- GUIで`old.html`と`new.html`を選択
- HTMLソースコードではなく、ブラウザで実際にレンダリングされたテキスト内容に対して差分を生成
- 文字単位の差分を生成し、追加/削除を色分け表示
- 差分結果を`iframe`で即時プレビュー
- 差分結果を任意の場所へHTML保存

色分けルール:

- 追加: 緑背景
- 削除: 赤背景 + 取り消し線

## 動作環境

- Node.js 18以上を推奨
- npm
- Windows/macOS/Linux（Electronが対応する環境）

## セットアップ

```bash
npm install
```

## 起動方法

```bash
npm start
```

## 使い方

1. 「古いHTML」の`選択`ボタンから比較元ファイルを指定
2. 「新しいHTML」の`選択`ボタンから比較先ファイルを指定
3. `差分生成`を押してプレビューを確認
4. `HTMLとして保存`で差分結果を保存

保存時のデフォルトファイル名は`diff_output.html`です。


## 依存ライブラリ

- [cheerio](https://github.com/cheeriojs/cheerio)
- [diff](https://github.com/kpdecker/jsdiff)

## 既知の制約

- 主にテキストノードの差分に着目した実装です
- レイアウト構造の大きな差異があるHTMLでは、期待通りの位置に差分マークが出ない場合があります
- `script`/`style`/`noscript`配下のテキストは差分対象外です

## ライセンス
このプロジェクトは [MIT License](./Licenses/License.txt)のもとで公開しています

## プライバシーポリシー
最終更新日：2026年4月22日

### データの収集について
本アプリは、ユーザーの個人情報およびデータを一切収集しません

### 処理の仕組み
ユーザーが選択したHTMLファイルをアプリ内で処理します
差分処理したHTMLのレンダリングはローカルで完結し、外部サーバーへのデータ送信は行いません

### 外部サービスへのアクセス
本アプリは、ユーザーのデータを外部へ送信しません

### Cookieおよびトラッキング
本アプリはCookie、ローカルストレージ、トラッキング技術を使用しません

### お問い合わせ
プライバシー・その他ご質問は、[GitHub Issues](https://github.com/msmsrep/RenderedHTMLDiff_Electron/issues) までお寄せください
