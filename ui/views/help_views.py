import discord

class HelpView(discord.ui.LayoutView):
    def __init__(self, bot, guild_id):
        super().__init__(timeout=180)
        self.bot = bot
        self.guild_id = guild_id
        self.build()

    def build(self):
        self.clear_items()
        gid = self.guild_id

        # Localized Title & Intro
        title = self.bot.get_feedback("help_title", guild_id=gid)
        intro = self.bot.get_feedback("help_desc_intro", guild_id=gid)

        # Support Link
        support_url = "https://discord.gg/PbvX3S7pXR"
        sup_label, sup_emoji = self.bot.parse_emoji_text(self.bot.get_feedback("btn_support_server", guild_id=gid))
        support_btn = discord.ui.Button(
            label=sup_label,
            emoji=sup_emoji,
            url=support_url,
            style=discord.ButtonStyle.link
        )

        # Close Button
        cls_label, cls_emoji = self.bot.parse_emoji_text(self.bot.get_feedback("btn_close_help", guild_id=gid))
        close_btn = discord.ui.Button(
            label=cls_label,
            emoji=cls_emoji,
            style=discord.ButtonStyle.secondary
        )
        async def close_callback(interaction: discord.Interaction):
            await interaction.response.defer()
            await interaction.delete_original_response()
        close_btn.callback = close_callback

        container_items = [
            discord.ui.TextDisplay(f"## {title}"),
            discord.ui.Separator(),
            discord.ui.TextDisplay(intro),
            discord.ui.Separator(),

            # Monitoring Section
            discord.ui.TextDisplay(f"### {self.bot.get_feedback('help_section_monitor', guild_id=gid)}"),
            discord.ui.TextDisplay(
                f"{self.bot.get_feedback('help_cmd_monitor_add', guild_id=gid)}\n"
                f"{self.bot.get_feedback('help_cmd_monitor_list', guild_id=gid)}\n"
                f"{self.bot.get_feedback('help_cmd_monitor_edit', guild_id=gid)}\n"
                f"{self.bot.get_feedback('help_cmd_monitor_status', guild_id=gid)}\n"
                f"{self.bot.get_feedback('help_cmd_monitor_check', guild_id=gid)}\n"
                f"{self.bot.get_feedback('help_cmd_monitor_preview', guild_id=gid)}\n"
                f"{self.bot.get_feedback('help_cmd_monitor_repost', guild_id=gid)}"
            ),
            discord.ui.Separator(),

            # Admin Section
            discord.ui.TextDisplay(f"### {self.bot.get_feedback('help_section_admin', guild_id=gid)}"),
            discord.ui.TextDisplay(
                f"{self.bot.get_feedback('help_cmd_purge', guild_id=gid)}\n"
                f"{self.bot.get_feedback('help_cmd_setup', guild_id=gid)}\n"
                f"{self.bot.get_feedback('help_cmd_set_language', guild_id=gid)}\n"
                f"{self.bot.get_feedback('help_cmd_set_admin', guild_id=gid)}\n"
                f"{self.bot.get_feedback('help_cmd_set_template', guild_id=gid)}\n"
                f"{self.bot.get_feedback('help_cmd_set_interval', guild_id=gid)}"
            ),
            discord.ui.Separator(),

            # Premium Section
            discord.ui.TextDisplay(f"### {self.bot.get_feedback('help_section_premium', guild_id=gid)}"),
            discord.ui.TextDisplay(
                f"{self.bot.get_feedback('help_cmd_premium_check', guild_id=gid)}\n"
                f"{self.bot.get_feedback('help_cmd_premium_activate', guild_id=gid)}\n"
                f"{self.bot.get_feedback('help_cmd_premium_buy', guild_id=gid)}"
            ),
            discord.ui.Separator(),

            discord.ui.ActionRow(close_btn, support_btn)
        ]

        # Container with the "beautiful blue" light blue accent color
        self.add_item(discord.ui.Container(*container_items, accent_color=0x40C4FF))
