import { CaptionPlugin } from "@platejs/caption/react";
import {
  AudioPlugin,
  FilePlugin,
  ImagePlugin,
  MediaEmbedPlugin,
  PlaceholderPlugin,
  VideoPlugin,
} from "@platejs/media/react";
import { KEYS } from "platejs";

import { AudioElement } from "../../ui/media-audio-node";
import { MediaEmbedElement } from "../../ui/media-embed-node";
import { FileElement } from "../../ui/media-file-node";
import { ImageElement } from "../../ui/media-image-node";
import { PlaceholderElement } from "../../ui/media-placeholder-node";
import { MediaPreviewDialog } from "../../ui/media-preview-dialog";
import { MediaUploadToast } from "../../ui/media-upload-toast";
import { VideoElement } from "../../ui/media-video-node";
import { ImageElementStatic } from "../../ui/media-image-node-static";
import { VideoElementStatic } from "../../ui/media-video-node-static";
import { AudioElementStatic } from "../../ui/media-audio-node-static";
import { FileElementStatic } from "../../ui/media-file-node-static";
import { PlaceholderElementStatic } from "../../ui/media-placeholder-node-static";

export const MediaKit = [
  ImagePlugin.configure({
    options: { disableUploadInsert: true },
    render: { afterEditable: MediaPreviewDialog, node: ImageElement },
  }),
  MediaEmbedPlugin.withComponent(MediaEmbedElement),
  VideoPlugin.withComponent(VideoElement),
  AudioPlugin.withComponent(AudioElement),
  FilePlugin.withComponent(FileElement),
  PlaceholderPlugin.configure({
    options: { disableEmptyPlaceholder: true },
    render: { afterEditable: MediaUploadToast, node: PlaceholderElement },
  }),
  CaptionPlugin.configure({
    options: {
      query: {
        allow: [KEYS.img, KEYS.video, KEYS.audio, KEYS.file, KEYS.mediaEmbed],
      },
    },
  }),
];

export const MediaKitStatic = [
  ImagePlugin.configure({
    options: { disableUploadInsert: true },
    render: { node: ImageElementStatic },
  }),
  MediaEmbedPlugin.withComponent(MediaEmbedElement),
  VideoPlugin.withComponent(VideoElementStatic),
  AudioPlugin.withComponent(AudioElementStatic),
  FilePlugin.withComponent(FileElementStatic),
  PlaceholderPlugin.configure({
    options: { disableEmptyPlaceholder: true },
    render: { node: PlaceholderElementStatic },
  }),
  CaptionPlugin.configure({
    options: {
      query: {
        allow: [KEYS.img, KEYS.video, KEYS.audio, KEYS.file, KEYS.mediaEmbed],
      },
    },
  }),
];
