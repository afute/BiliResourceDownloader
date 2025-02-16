<script setup lang="ts">
import { APIFetch } from "../../APIFetch.ts";
import {
  BatchDownloadTask,
  GeneralSuitItem,
  SuitCardBGProperties,
  SuitCardProperties,
  SuitDetail,
  SuitEmojiPackageProperties,
  SuitLoadingProperties,
  SuitPartType,
  SuitPendantProperties,
  SuitPlayIconProperties,
  SuitRank,
  SuitSkinProperties,
  SuitSpaceBGProperties,
  SuitThumbUpProperties
} from "../../types.ts";
import { sep } from "@tauri-apps/api/path";
import { autoJump, resolveText } from "../../utils/linkResolver.ts";

const route = useRoute<'/suit/[id]'>()

const ids = ref<string[]>([])
const name = ref('')
const mid = ref('')
const jumpLink = ref('')

const debugRequestNames = ref<string[]>([])

const cards = ref<GeneralSuitItem<SuitCardProperties>[]>([])
const cardBgs = ref<GeneralSuitItem<SuitCardBGProperties>[]>([])
const emojiPackages = ref<(GeneralSuitItem<SuitEmojiPackageProperties> & {
  items: {
    // [XXX_xxx]格式
    name: string
    properties: {
      image: string
    }
  }[]
})[]>([])
const loadings = ref<GeneralSuitItem<SuitLoadingProperties>[]>([])
const playIcons = ref<GeneralSuitItem<SuitPlayIconProperties>[]>([])
const skins = ref<GeneralSuitItem<SuitSkinProperties>[]>([])
const spaceBgs = ref<GeneralSuitItem<SuitSpaceBGProperties>[]>([])
const thumpUps = ref<GeneralSuitItem<SuitThumbUpProperties>[]>([])
const pendants = ref<GeneralSuitItem<SuitPendantProperties>[]>([])

const suitDescription = ref<string>()
const saleStartTime = ref(0)
const saleEndTime = ref(0)

const saleType = ref('')
const currentState = ref('')
const saleCount = ref<number>()

const getSpaceBgImages = (spaceBgProp: Record<string, string>) => {
  const landscapes: string[] = []
  const portraits: string[] = []
  let index = 1
  while (true) {
    if (`image${index}_landscape` in spaceBgProp) {
      landscapes.push(spaceBgProp[`image${index}_landscape`])
      portraits.push(spaceBgProp[`image${index}_portrait`])
      index++
    } else {
      break
    }
  }
  return [landscapes, portraits]
}

const skinProps = [
  ['head_bg', '顶部背景图'],
  ['head_tab_bg', '首页顶部标签页背景'],
  ['tail_bg', '底部背景图'],
  ['tail_icon_main', '首页按钮图标'],
  ['tail_icon_channel', '频道按钮图标'],
  ['tail_icon_dynamic', '动态按钮图标'],
  ['tail_icon_pub_btn_bg', '发布按钮图标'],
  ['tail_icon_shop', '会员购按钮图标'],
  ['tail_icon_myself', '“我的”按钮图标'],
  ['tail_icon_selected_main', '首页按钮选中图标'],
  ['tail_icon_selected_channel', '频道按钮选中图标'],
  ['tail_icon_selected_dynamic', '动态按钮选中图标'],
  ['tail_icon_selected_pub_btn_bg', '发布按钮选中图标'],
  ['tail_icon_selected_shop', '会员购按钮选中图标'],
  ['tail_icon_selected_myself', '“我的”按钮选中图标'],
  ['head_myself_squared_bg', '“我的”界面背景图'],
  // ['head_myself_mp4_bg', '“我的”界面背景视频'],
]

const withSuffix = (source: string, suffix: string) => source.endsWith(suffix) ? source : `${source}${suffix}`

const generateDownloadTask = () => {
  let task: BatchDownloadTask = {
    name: name.value,
    files: [],
  }

  // 空间背景图
  spaceBgs.value.forEach(spaceBg => {
    const [landscapes, portraits] = getSpaceBgImages(spaceBg.properties)
    task.files.push(...landscapes.map((l, index) => {
      const spaceBgName = withSuffix(spaceBg.name, '背景')
      return {
        path: `${name.value}${sep()}${spaceBgName}${sep()}背景${index + 1}`,
        url: l,
      }
    }))
    task.files.push(...portraits.map((p, index) => {
      const spaceBgName = withSuffix(spaceBg.name, '肖像')
      return {
        path: `${name.value}${sep()}${spaceBgName}${sep()}肖像${index + 1}`,
        url: p,
      }
    }))
  })

  // 表情包
  emojiPackages.value.forEach(emojiPackage => {
    const emojiInfo = emojiPackage.items
    task.files.push(...emojiInfo.map(emoji => {
      const emojiPackageName = withSuffix(emojiPackage.name, '表情包')
      const emojiName = emoji.name.split('_')[1]?.slice(0, -1) ?? emoji.name
      return {
        path: `${name.value}${sep()}${emojiPackageName}${sep()}${emojiName}`,
        url: emoji.properties.image,
      }
    }))
  })

  // 进度条
  playIcons.value.forEach(playIcon => {
    const playIconName = withSuffix(playIcon.name, '进度条')
    if (playIcon.properties.drag_icon) {
      // Lottie动画进度条
      task.files.push(...[
        {
          path: `${name.value}${sep()}${playIconName}${sep()}进度条拖动动画`,
          url: playIcon.properties.drag_icon ?? '',
        },
        {
          path: `${name.value}${sep()}${playIconName}${sep()}进度条松手动画`,
          url: playIcon.properties.icon ?? '',
        },
      ])
    } else {
      // 图片进度条
      task.files.push(...[
        {
          path: `${name.value}${sep()}${playIconName}${sep()}进度条左划`,
          url: playIcon.properties.drag_left_png ?? '',
        },
        {
          path: `${name.value}${sep()}${playIconName}${sep()}进度条右划`,
          url: playIcon.properties.drag_right_png ?? '',
        },
        {
          path: `${name.value}${sep()}${playIconName}${sep()}指示`,
          url: playIcon.properties.middle_png ?? '',
        },
      ])
    }

    task.files.push(...[
      {
        path: `${name.value}${sep()}${playIconName}${sep()}方形演示图`,
        url: playIcon.properties.squared_image ?? '',
      }, {
        path: `${name.value}${sep()}${playIconName}${sep()}图标`,
        url: playIcon.properties.static_icon_image ?? '',
      },
    ])
  })

  // 皮肤
  skins.value.forEach(skin => {
    const skinName = withSuffix(skin.name, '皮肤')
    task.files.push(...skinProps
        .filter(([p]) => (skin.properties[p as keyof typeof skin.properties]?.length ?? 0) > 0)
        .map(([prop, desc]) => {
          return {
            path: `${name.value}${sep()}${skinName}${sep()}${desc ?? prop}`,
            url: skin.properties[prop as keyof typeof skin.properties] ?? '',
          }
        })
    )

    if (skin.properties.head_myself_mp4_bg) {
      task.files.push({
        path: `${name.value}${sep()}${skinName}${sep()}“我的”界面背景视频`,
        url: skin.properties.head_myself_mp4_bg,
      })
    }
  })

  // 头像框
  pendants.value.forEach(pendant => {
    task.files.push({
      path: `${name.value}${sep()}${name.value}头像框${sep()}${pendant.name}`,
      url: pendant.properties.image,
    })
  })


  // 粉丝牌背景
  cards.value.forEach(card => {
    task.files.push({
      path: `${name.value}${sep()}${withSuffix(card.name, '粉丝牌背景')}`,
      url: card.properties.image,
    })
  })

  // 评论背景
  cardBgs.value.forEach(cardBg => {
    task.files.push({
      path: `${name.value}${sep()}${withSuffix(cardBg.name, '评论背景')}`,
      url: cardBg.properties.image,
    })
  })

  // 加载动画
  loadings.value.forEach(loading => {
    task.files.push({
      path: `${name.value}${sep()}${withSuffix(loading.name, '加载动画')}`,
      url: loading.properties.loading_url,
    })

    task.files.push({
      path: `${name.value}${sep()}${withSuffix(loading.name, '加载动画')}(序列帧)`,
      url: loading.properties.loading_frame_url,
    })
  })

  // 点赞动画
  thumpUps.value.forEach(thumpUp => {
    task.files.push({
      path: `${name.value}${sep()}${withSuffix(thumpUp.name, '点赞动画')}`,
      url: thumpUp.properties.image_ani,
      extension: '.svga',
    })
  })

  task.files = task.files.flat()
  return task
}

const loading = ref(false)
const router = useRouter()
const fetchData = async () => {
  ids.value = route.params.id.split(',')

  loading.value = true
  saleType.value = ''
  saleCount.value = undefined
  debugRequestNames.value = []

  let suitDetail: SuitDetail
  suitDetail = {
    name: route.query.name as string ?? '未知',
    item_id: 0,
    part_id: 6,
    suit_items: {},
    buy_link: '',
    biz_sale_type: '',
    state: '',
  }

  // 批量获取装扮所有部分的信息
  const results = (await Promise.all(ids.value.map(id => {
    const url = new URL('https://api.bilibili.com/x/garb/v2/user/suit/benefit')
    url.searchParams.set('item_id', id)
    url.searchParams.set('part', 'cards')
    debugRequestNames.value.push(`部分装扮信息${id}`)

    return APIFetch<SuitDetail>(url, undefined, {
      debug: {
        name: `部分装扮信息${id}`,
        extraParams: {
          item_id: '装扮ID'
        }
      }
    })
  }))).map(r => r.data)

  if (!results[0]) {
    ElMessage({
      message: '解析装扮信息失败，该装扮信息无效！',
      type: 'error',
    })
    loading.value = false
    return
  }

  suitDetail.biz_sale_type = results[0].biz_sale_type
  suitDetail.state = results[0].state
  suitDetail.buy_link = results[0].buy_link
  suitDetail.name = suitDetail.name === '未知' ? results[0].name : suitDetail.name

  // 处理所有返回结果，合并多种类装扮信息
  for (let r of results) {
    let skinProperties: SuitSkinProperties
    switch (r.part_id) {
      case SuitPartType.suit:
        suitDetail = r
        // 若ID来自部分装扮信息，跳转至完整装扮信息ID链接
        if (suitDetail.item_id.toString() !== ids.value[0]) {
          await router.replace(`/suit/${suitDetail.item_id}`)
          return
        }
        // 如果是完整装扮信息，直接停止解析并返回
        saleStartTime.value = r.properties?.sale_time_begin ?? 0
        saleEndTime.value = r.properties?.sale_time_end ?? 0
        suitDescription.value = r.properties?.desc
        break
      case SuitPartType.thumbUp:
        if (suitDetail.suit_items.thumbup === undefined) {
          suitDetail.suit_items.thumbup = []
        }
        suitDetail.suit_items.thumbup.push({
          name: suitDetail.name,
          item_id: r.part_id,
          properties: r.properties as unknown as SuitThumbUpProperties,
        })
        break
      case SuitPartType.loading:
        if (suitDetail.suit_items.loading === undefined) {
          suitDetail.suit_items.loading = []
        }
        suitDetail.suit_items.loading.push({
          name: suitDetail.name,
          item_id: r.part_id,
          properties: r.properties as unknown as SuitLoadingProperties,
        })
        break
      case SuitPartType.playIcon:
        if (suitDetail.suit_items.play_icon === undefined) {
          suitDetail.suit_items.play_icon = []
        }
        suitDetail.suit_items.play_icon.push({
          name: suitDetail.name,
          item_id: r.part_id,
          properties: r.properties as unknown as SuitPlayIconProperties,
        })
        break
      case SuitPartType.skin:
        if (suitDetail.suit_items.skin === undefined) {
          suitDetail.suit_items.skin = []
        }

        skinProperties = r.properties as unknown as SuitSkinProperties
        // “我的”界面背景视频需要特殊处理
        if (!skinProperties.head_myself_mp4_bg?.startsWith('https')) {
          skinProperties.head_myself_mp4_bg = (r.suit_items.emoji_package?.[0] as GeneralSuitItem<SuitSkinProperties>)?.properties?.head_myself_mp4_bg
        }

        suitDetail.suit_items.skin.push({
          name: suitDetail.name,
          item_id: r.part_id,
          properties: skinProperties,
        })
        break
      case SuitPartType.pendant:
        if (suitDetail.suit_items.pendant === undefined) {
          suitDetail.suit_items.pendant = []
        }
        suitDetail.suit_items.pendant.push({
          name: suitDetail.name,
          item_id: r.part_id,
          properties: r.properties as unknown as SuitPendantProperties,
        })
        break
    }
  }

  name.value = suitDetail.name
  mid.value = suitDetail.properties?.fan_mid ?? ''
  saleType.value = suitDetail.biz_sale_type
  currentState.value = suitDetail.state
  jumpLink.value = suitDetail.buy_link ?? ''

  cards.value = suitDetail.suit_items.card ?? []
  cardBgs.value = suitDetail.suit_items.card_bg ?? []
  emojiPackages.value = suitDetail.suit_items.emoji_package as (GeneralSuitItem<SuitEmojiPackageProperties> & {
    items: {
      // [XXX_xxx]格式
      name: string
      properties: {
        image: string
      }
    }[]
  })[] ?? []
  loadings.value = suitDetail.suit_items.loading ?? []
  playIcons.value = suitDetail.suit_items.play_icon ?? []
  skins.value = suitDetail.suit_items.skin ?? []
  spaceBgs.value = suitDetail.suit_items.space_bg ?? []
  thumpUps.value = suitDetail.suit_items.thumbup ?? []
  pendants.value = suitDetail.suit_items.pendant ?? []

  try {
    const url = new URL('https://api.bilibili.com/x/garb/rank/fan/recent')
    url.searchParams.set('item_id', ids.value[0])
    debugRequestNames.value.push('装扮播报')
    const resp = await APIFetch<SuitRank>(url, undefined, {
      debug: {
        name: '装扮播报',
        extraParams: {
          item_id: '装扮ID',
        }
      }
    })

    let count = 0
    let lastID = -1

    for (let index in resp.data.rank) {
      const rank = resp.data.rank[index]
      // 若当前编号等于上一个编号 - 1，认为是非预留的编号
      if (rank.number + 1 === lastID) {
        count += rank.number
        break
      }
      // 否则认为是预留编号
      count++
      lastID = rank.number
    }

    saleCount.value = count
  } catch (e) {
    ElMessage({
      message: `获取销量出错：${e}`,
      type: 'error'
    })
  }

  loading.value = false
}

watch(() => route.params.id, fetchData, { immediate: true })

const resolveLink = async () => {
  if (resolveText(jumpLink.value) !== null) {
    await autoJump(jumpLink.value, true)
  } else {
    window.open(jumpLink.value)
  }
}

</script>

<template>
  <div v-loading="loading">
    <ElDescriptions
      border
      :column="2"
    >
      <template #title>
        装扮相关信息
      </template>
      <template #extra>
        <div class="flex flex-row">
          <DebugButton :names="debugRequestNames" />
          <QRCodeDialogButton
            button-text="在App端查看"
            title="在App端扫码查看该装扮"
            :content="(jumpLink.length > 0) ? jumpLink : `https://www.bilibili.com/h5/mall/suit/detail?id=${ids[0]}`"
          />
          <BatchDownloadButton :task="generateDownloadTask" />
        </div>
      </template>

      <!-- 装扮名称 -->
      <ElDescriptionsItem label="名称">
        <ElLink
          type="primary"
          target="_blank"
          :href="jumpLink.length > 0 ? jumpLink : `https://www.bilibili.com/h5/mall/suit/detail?id=${ids[0]}`"
        >
          {{ name }}
        </ElLink>
      </ElDescriptionsItem>

      <!-- 大会员类型装扮标记 -->
      <ElDescriptionsItem
        label="来源"
        v-if="saleType === 'vip'"
      >
        大会员专属
      </ElDescriptionsItem>

      <!-- 装扮链接 -->
      <ElDescriptionsItem
        label="相关链接"
        v-if="jumpLink.length > 0"
      >
        <ElLink
          type="primary"
          @click="resolveLink"
        >
          点击跳转
        </ElLink>
      </ElDescriptionsItem>

      <!-- 装扮所属UP -->
      <ElDescriptionsItem
        label="相关UP信息"
        v-if="mid.length > 0"
      >
        <UPInfo :mid="mid" />
      </ElDescriptionsItem>

      <!-- 装扮简介 -->
      <ElDescriptionsItem
        label="简介"
        :span="2"
        v-if="suitDescription"
      >
        <div class="whitespace-pre-wrap">
          {{ suitDescription }}
        </div>
      </ElDescriptionsItem>
      <ElDescriptionsItem
        label="销售时间"
        :span="2"
        v-if="saleStartTime > 0"
      >
        <div class="whitespace-pre-wrap">
          {{ new Date(saleStartTime * 1000).toLocaleString() }} - {{ new Date(saleEndTime * 1000).toLocaleString() }}
        </div>
      </ElDescriptionsItem>

      <!-- 推测装扮销量 -->
      <ElDescriptionsItem
        label="销量"
        v-if="saleCount"
      >
        <ElTooltip
          content="销量由装扮播报推测，已扣除预留编号影响"
          placement="bottom-start"
          effect="light"
        >
          {{ saleCount }}
        </ElTooltip>
      </ElDescriptionsItem>
    </ElDescriptions>

    <ElText
      class="self-start block mt-2"
      type="danger"
      v-if="!loading && saleType !== 'vip' && mid.length === 0 && jumpLink.length === 0"
    >
      * 该装扮来源信息缺失，可能已经下架或无效
    </ElText>

    <ElText
      class="self-start block mt-2"
      type="danger"
      v-if="currentState === 'inactive'"
    >
      * 该装扮已下架
    </ElText>

    <!-- 空间背景图 -->
    <template v-if="spaceBgs?.length ?? 0 > 0">
      <div
        v-for="spaceBg in spaceBgs"
        :key="spaceBg.item_id"
      >
        <CustomDivider>空间背景图 - {{ spaceBg.name }}</CustomDivider>
        <ElSpace
          class="w-full justify-center"
          wrap
        >
          <ImageVideoCard
            v-for="(image, index) in getSpaceBgImages(spaceBg.properties)[1]"
            :key="image"
            :title="`背景${index + 1}`"
            :image="image"
            :download-name="`${name} - ${spaceBg.name} - 背景${index + 1}`"
            :preview-images="getSpaceBgImages(spaceBg.properties)[1]"
            :index="index"
          />
        </ElSpace>
        <ElSpace
          class="w-full justify-center mt-4"
          wrap
        >
          <ImageVideoCard
            v-for="(image, index) in getSpaceBgImages(spaceBg.properties)[0]"
            :key="image"
            :title="`肖像${index + 1}`"
            :image="image"
            :download-name="`${name} - ${spaceBg.name} - 肖像${index + 1}`"
            :preview-images="getSpaceBgImages(spaceBg.properties)[0]"
            :index="index"
          />
        </ElSpace>
      </div>
    </template>

    <!-- 表情包 -->
    <template v-if="emojiPackages?.length ?? 0 > 0">
      <div
        v-for="emojiInfo in emojiPackages"
        :key="emojiInfo.item_id"
      >
        <CustomDivider>表情包 - {{ emojiInfo.name }}</CustomDivider>
        <ElSpace
          class="w-full justify-center"
          wrap
        >
          <ImageVideoCard
            v-for="(emoji, index) in emojiInfo.items"
            :key="emoji.name"
            :title="emoji.name.split('_')[1].slice(0, -1) ?? emoji.name"
            :image="emoji.properties.image"
            :download-name="`${name} - ${emojiInfo.name} - ${emoji.name.split('_')[1].slice(0, -1) ?? emoji.name}`"
            :preview-images="emojiInfo.items.map(e => e.properties.image)"
            :index="index"
          />
        </ElSpace>
      </div>
    </template>

    <!-- 进度条 -->
    <template v-if="playIcons?.length ?? 0 > 0">
      <CustomDivider>进度条 - {{ playIcons[0].name }}</CustomDivider>
      <div
        v-for="icon in playIcons"
        :key="icon.item_id"
      >
        <ElSpace
          class="w-full justify-center"
          wrap
        >
          <template v-if="icon.properties.drag_icon">
            <!-- 动画进度条 -->
            <KeepAlive>
              <LottieAnimationCard
                :url="icon.properties.drag_icon"
                title="进度条拖动动画"
                :download-name="`${name} - ${icon.name} - 进度条拖动动画`"
              />
            </KeepAlive>
            <KeepAlive>
              <LottieAnimationCard
                :url="icon.properties.icon"
                title="进度条松手动画"
                :download-name="`${name} - ${icon.name} - 进度条松手动画`"
              />
            </KeepAlive>
          </template>
          <template v-else>
            <!-- 图片进度条 -->
            <ImageVideoCard
              title="进度条左滑"
              :image="icon.properties.drag_left_png"
              :download-name="`${name} - ${icon.name} - 进度条左滑`"
            />
            <ImageVideoCard
              title="进度条右滑"
              :image="icon.properties.drag_right_png"
              :download-name="`${name} - ${icon.name} - 进度条右滑`"
            />
            <ImageVideoCard
              title="进度条指示"
              :image="icon.properties.middle_png"
              :download-name="`${name} - ${icon.name} - 进度条指示`"
            />
          </template>

          <!-- 其他内容 -->
          <ImageVideoCard
            title="方形演示图"
            :image="icon.properties.squared_image"
            :download-name="`${name} - ${icon.name} - 方形演示图`"
          />
          <ImageVideoCard
            title="图标"
            :image="icon.properties.static_icon_image"
            :download-name="`${name} - ${icon.name} - 图标`"
          />
        </ElSpace>
      </div>
    </template>

    <!-- 皮肤 -->
    <template v-if="skins?.length ?? 0 > 0">
      <div
        v-for="skin in skins"
        :key="skin.item_id"
      >
        <CustomDivider>皮肤 - {{ skin.name }}</CustomDivider>
        <ElSpace
          class="w-full justify-center"
          wrap
        >
          <template
            v-for="([prop, desc], index) in skinProps.filter(([p]) => (skin.properties[p]?.length ?? 0) > 0)"
            :key="prop"
          >
            <SVGACard
              v-if="skin.properties[prop].endsWith('.bin')"
              :title="desc ?? prop"
              :url="skin.properties[prop]"
              :download-name="`${name} - ${skin.name} - ${desc ?? prop}`"
            />
            <ImageVideoCard
              v-else
              :title="desc ?? prop"
              :image="skin.properties[prop]"
              :download-name="`${name} - ${skin.name} - ${desc ?? prop}`"
              :preview-images="skinProps.filter(([p]) => (skin.properties[p]?.length ?? 0) > 0).map(([p]) => skin.properties[p])"
              :index="index"
            />
          </template>

          <ImageVideoCard
            v-if="skin.properties.head_myself_mp4_bg"
            :video="skin.properties.head_myself_mp4_bg"
            title="“我的”界面背景视频"
            :download-name="`${name} - ${skin.name} - “我的”界面背景视频`"
          />
        </ElSpace>
      </div>
    </template>

    <!-- 点赞动画 -->
    <template v-if="thumpUps.length > 0">
      <CustomDivider>点赞动画</CustomDivider>
      <ElSpace
        class="w-full justify-center"
        wrap
      >
        <KeepAlive>
          <SVGACard
            v-for="thumpUp in thumpUps"
            :key="thumpUp.item_id"
            :title="thumpUp.name + ' - 点赞动画'"
            :url="thumpUp.properties.image_ani"
          />
        </KeepAlive>
      </ElSpace>
    </template>

    <!-- 杂项 -->
    <CustomDivider>杂项</CustomDivider>
    <ElSpace
      class="w-full justify-center"
      wrap
    >
      <!-- 头像框 -->
      <ImageVideoCard
        v-for="pendant in pendants"
        :key="pendant.item_id"
        :title="pendant.name + ' - 头像框'"
        :image="pendant.properties.image"
        :download-name="`${name} - ${pendant.name} - 头像框`"
      />

      <!-- 粉丝牌背景 -->
      <ImageVideoCard
        v-for="card in cards"
        :key="card.item_id"
        :title="card.name + ' - 粉丝牌'"
        :image="card.properties.image"
        :download-name="`${name} - ${card.name} - 粉丝牌`"
      />

      <!-- 评论背景 -->
      <ImageVideoCard
        v-for="card in cardBgs"
        :key="card.item_id"
        :title="card.name + ' - 评论背景'"
        :image="card.properties.image"
        :download-name="`${name} - ${card.name} - 评论背景`"
      />

      <!-- 加载动画 -->
      <ImageVideoCard
        v-for="load in loadings"
        :key="load.item_id"
        :title="load.name + ' - 加载动画'"
        :image="load.properties.loading_url"
        :download-name="`${name} - ${load.name} - 加载动画`"
      />
      <ImageVideoCard
        v-for="load in loadings"
        :key="load.item_id"
        :title="load.name + ' - 加载动画(序列帧)'"
        :image="load.properties.loading_frame_url"
        :download-name="`${name} - ${load.name} - 加载动画(序列帧)`"
      />
    </ElSpace>
  </div>
</template>
