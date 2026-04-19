import discord

class MonitorListPaginatedView(discord.ui.LayoutView):
    def __init__(self, bot, guild_id, pages_data, total_count):
        super().__init__(timeout=120)
        self.bot = bot
        self.guild_id = guild_id
        self.pages_data = pages_data
        self.total_count = total_count
        self.current_page = 0
        self.update_components()

    def update_components(self):
        self.clear_items()
        
        page_content = self.pages_data[self.current_page]
        title_text = f"### **{self.bot.get_feedback('list_monitors_title', guild_id=self.guild_id)}**"
        if len(self.pages_data) > 1:
            title_text += f" (Oldal {self.current_page+1}/{len(self.pages_data)})"
            
        footer_text = f"*{self.bot.get_feedback('list_monitors_footer', count=self.total_count, guild_id=self.guild_id)}*"
        
        container_items = [
            discord.ui.TextDisplay(title_text),
            discord.ui.Separator(),
            discord.ui.TextDisplay(page_content),
            discord.ui.Separator(),
            discord.ui.TextDisplay(footer_text)
        ]
        
        if len(self.pages_data) > 1:
            self.btn_prev = discord.ui.Button(label="◀ Előző", style=discord.ButtonStyle.secondary, disabled=(self.current_page == 0))
            self.btn_prev.callback = self.prev_callback
            self.btn_next = discord.ui.Button(label="Következő ▶", style=discord.ButtonStyle.secondary, disabled=(self.current_page == len(self.pages_data)-1))
            self.btn_next.callback = self.next_callback
            container_items.append(discord.ui.ActionRow(self.btn_prev, self.btn_next))
            
        self.add_item(discord.ui.Container(*container_items, accent_color=0x5865F2))

    async def prev_callback(self, interaction: discord.Interaction):
        self.current_page -= 1
        self.update_components()
        await interaction.response.edit_message(view=self)
        
    async def next_callback(self, interaction: discord.Interaction):
        self.current_page += 1
        self.update_components()
        await interaction.response.edit_message(view=self)
